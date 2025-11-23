// js/src/forum/components/TrendsWidget.tsx

import app from 'flarum/common/app';

import Widget, {
  WidgetAttrs,
} from 'flarum/extensions/afrux-forum-widgets-core/common/components/Widget';

import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Link from 'flarum/common/components/Link';
import icon from 'flarum/common/helpers/icon';
import Discussion from 'flarum/common/models/Discussion';

import { extName } from '../../common/extName';

interface TrendsWidgetAttrs extends WidgetAttrs {}

export default class TrendsWidget extends Widget<TrendsWidgetAttrs> {
  loading = true;
  trends: Discussion[] = [];

  className(): string {
    return 'liplum-trends-widget';
  }

  icon(): string {
    return 'fas fa-fire-alt';
  }

  title(): string {
    return app.translator.trans(`${extName}.forum.widget.title`) as string;
  }

  content() {
    if (this.loading) {
      return <LoadingIndicator />;
    }

    if (!this.trends || this.trends.length === 0) {
      return (
        <div className="liplum-trends-empty">
          {app.translator.trans(`${extName}.forum.widget.empty`)}
        </div>
      );
    }

    return (
      <div className="liplum-trends-content">
        <ul className="liplum-trends-list">
          {this.trends.map((disc) => (
            <li className="liplum-trends-item" key={disc.id()}>
              <Link
                href={app.route.discussion(disc)}
                className="liplum-trends-link"
              >
                {/* 左侧装饰点 */}
                <span className="liplum-trends-bullet" />

                {/* 标题 */}
                <span className="liplum-trends-title">{disc.title()}</span>

                {/* 右侧评论数 */}
                <span className="liplum-trends-stats">
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
    // —— 权限与环境防守 —— //
    const forum = (app as any).forum;

    // 在 admin 的布局预览里，很可能没有 forum 实例，直接不请求
    if (!forum || typeof forum.attribute !== 'function') {
      this.loading = false;
      this.trends = [];
      app.redraw();
      return;
    }

    // 没有“查看论坛”权限：不请求、不显示列表
    if (!forum.attribute('canViewForum')) {
      this.loading = false;
      this.trends = [];
      app.redraw();
      return;
    }

    this.loading = true;

    // 读取 widget 显示条数，默认 5
    const rawLimit = forum.attribute('liplum-trends.limit');
    const limit =
      typeof rawLimit === 'number'
        ? rawLimit
        : parseInt(rawLimit as string, 10) || 5;

    const params: Record<string, any> = {};
    // 多取一点，过滤后再截断
    params.limit = limit * 2;
    // 请求所需关联：tags/state/user
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
      console.error('[liplum-trends] Error fetching trends:', error);
      this.trends = [];
    } finally {
      this.loading = false;
      app.redraw();
    }
  }
}
