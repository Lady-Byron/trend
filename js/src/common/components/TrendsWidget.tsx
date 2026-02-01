import app from 'flarum/common/app';
import Widget, {
  WidgetAttrs,
} from 'flarum/extensions/afrux-forum-widgets-core/common/components/Widget';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Link from 'flarum/common/components/Link';
import icon from 'flarum/common/helpers/icon';
import Discussion from 'flarum/common/models/Discussion';

// m is provided globally by Flarum (JSX factory + redraw)
declare const m: { redraw(): void };

interface TrendsWidgetAttrs extends WidgetAttrs {}

interface TrendsApiRecord {
  id: string;
  type: string;
}

interface TrendsApiResponse {
  data: TrendsApiRecord[];
  [key: string]: unknown;
}

export class TrendsWidget extends Widget<TrendsWidgetAttrs> {
  loading = true;
  trends: Discussion[] = [];

  private static cache: { trends: Discussion[]; time: number } | null = null;
  private static readonly CACHE_TTL = 60_000;

  className(): string {
    return 'lady-byron-trends-widget';
  }

  icon(): string {
    return 'fas fa-fire-alt';
  }

  title(): string {
    return app.translator.trans('lady-byron-trends.forum.widget.title') as string;
  }

  content() {
    if (this.loading) {
      return <LoadingIndicator />;
    }

    if (!this.trends || this.trends.length === 0) {
      return (
        <div className="lady-byron-trends-empty">
          {app.translator.trans('lady-byron-trends.forum.widget.empty')}
        </div>
      );
    }

    return (
      <div className="lady-byron-trends-content">
        <ul className="lady-byron-trends-list">
          {this.trends.map((disc) => (
            <li className="lady-byron-trends-item" key={disc.id()}>
              <Link
                href={app.route.discussion(disc)}
                className="lady-byron-trends-link"
              >
                <span className="lady-byron-trends-bullet" />
                <span className="lady-byron-trends-title">{disc.title()}</span>
                <span className="lady-byron-trends-stats">
                  {icon('fas fa-comment-alt')} {disc.commentCount()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  oncreate(vnode: any) {
    super.oncreate(vnode);
    this.fetchTrends();
  }

  async fetchTrends() {
    const forum = app.forum;

    // admin widget preview has no forum model
    if (!forum || typeof forum.attribute !== 'function') {
      this.loading = false;
      this.trends = [];
      m.redraw();
      return;
    }

    if (!forum.attribute('canViewForum')) {
      this.loading = false;
      this.trends = [];
      m.redraw();
      return;
    }

    // Serve from client-side cache if fresh
    if (TrendsWidget.cache && Date.now() - TrendsWidget.cache.time < TrendsWidget.CACHE_TTL) {
      this.trends = TrendsWidget.cache.trends;
      this.loading = false;
      m.redraw();
      return;
    }

    this.loading = true;

    const rawLimit = forum.attribute<string | number>('lady-byron-trends.limit');
    const limit =
      typeof rawLimit === 'number'
        ? rawLimit
        : parseInt(String(rawLimit), 10) || 5;

    const params: Record<string, string | number> = {
      limit: limit * 2,
      include: 'tags,state,user',
    };

    try {
      const response = await app.request<TrendsApiResponse>({
        method: 'GET',
        url: forum.attribute<string>('apiUrl') + '/trends/recent',
        params,
      });

      app.store.pushPayload(response);

      const models = (response.data || [])
        .map((record: TrendsApiRecord) =>
          app.store.getById<Discussion>('discussions', record.id)
        )
        .filter((disc): disc is Discussion => !!disc);

      // Filter discussions whose tags the user has blocked (subscription === 'hide').
      // tag is typed as any because flarum/tags is an optional extension.
      const filtered = models.filter((disc) => {
        const tags = disc.tags?.();
        if (!tags) return true;

        return !tags.some(
          (tag: any) =>
            typeof tag.subscription === 'function' &&
            tag.subscription() === 'hide'
        );
      });

      this.trends = filtered.slice(0, limit);
      TrendsWidget.cache = { trends: this.trends, time: Date.now() };
    } catch (error) {
      console.error('[lady-byron-trends] Error fetching trends:', error);
      this.trends = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }
}
