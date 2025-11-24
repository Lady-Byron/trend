import app from 'flarum/common/app';
import Widget, {
  WidgetAttrs,
} from 'flarum/extensions/afrux-forum-widgets-core/common/components/Widget';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Link from 'flarum/common/components/Link';
import icon from 'flarum/common/helpers/icon';
import Discussion from 'flarum/common/models/Discussion';

interface TrendsWidgetAttrs extends WidgetAttrs {}

export default class TrendsWidget extends Widget<TrendsWidgetAttrs> {
  loading = true;
  trends: Discussion[] = [];

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
                {/* 左侧装饰点 */}
                <span className="lady-byron-trends-bullet" />

                {/* 标题 */}
                <span className="lady-byron-trends-title">{disc.title()}</span>

                {/* 右侧评论数 */}
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
    const forum = (app as any).forum;

    // —— admin 布局预览里没有 forum：直接不请求 —— //
    if (!forum || typeof forum.attribute !== 'function') {
      this.loading = false;
      this.trends = [];
      m.redraw();
      return;
    }

    // —— 没有“查看论坛”权限：不请求、不显示列表 —— //
    if (!forum.attribute('canViewForum')) {
      this.loading = false;
      this.trends = [];
      m.redraw();
      return;
    }

    this.loading = true;

    // Widget 显示条数（默认 5）
    // 修改：使用 lady-byron-trends 键名
    const rawLimit = forum.attribute('lady-byron-trends.limit');
    const limit =
      typeof rawLimit === 'number'
        ? rawLimit
        : parseInt(rawLimit as string, 10) || 5;

    const params: Record<string, any> = {};
    params.limit = limit * 2; // 多取一点，过滤后再截断
    params.include = 'tags,state,user';

    try {
      const response = await app.request<any>({
        method: 'GET',
        url: forum.attribute('apiUrl') + '/trends/recent',
        params,
      });

      app.store.pushPayload(response);

      const data = (response && (response as any).data) || [];
      const models = (data as any[])
        .map((record) =>
          app.store.getById('discussions', record.id)
        )
        .filter((disc: Discussion | null) => !!disc) as Discussion[];

      // 过滤：联动 block-tags，隐藏 subscription() === 'hide' 的 tag
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[lady-byron-trends] Error fetching trends:', error);
      this.trends = [];
    } finally {
      this.loading = false;
      m.redraw();
    }
  }
}
