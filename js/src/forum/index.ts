import app from 'flarum/forum/app';
import Widgets from 'flarum/extensions/afrux-forum-widgets-core/common/extend/Widgets';

import TrendsWidget from './components/TrendsWidget';
import { extName } from '../common/extName';

app.initializers.add(extName, () => {
  // 权限检查：没有“查看论坛”权限就不要注册组件
  if (!app.forum.attribute('canViewForum')) {
    return;
  }

  new Widgets()
    .add({
      key: 'liplum-trends-widget',
      component: TrendsWidget,
      isDisabled: false,
      isUnique: true,
      placement: 'top',
      position: 1,
    })
    .extend(app, extName);
});
