import type Application from 'flarum/common/Application';
import Widgets from 'flarum/extensions/afrux-forum-widgets-core/common/extend/Widgets';
import { TrendsWidget } from './components/TrendsWidget';

export default function registerWidget(app: Application) {
  new Widgets()
    .add({
      key: 'lady-byron-trends-widget',
      component: TrendsWidget,
      isDisabled: false,
      isUnique: true,
      placement: 'top',
      position: 1,
    })
    .extend(app, 'lady-byron-trend');
}
