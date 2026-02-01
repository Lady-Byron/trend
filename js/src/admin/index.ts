import app from 'flarum/admin/app';
import commonApp from 'flarum/common/app';
import registerWidget from '../common/register';

// 注册扩展 ID：必须与 composer.json (lady-byron/trends) 对应
app.initializers.add('lady-byron-trends', () => {
  // 1) 在 Afrux Widgets Core 中注册 widget（后台布局管理需要）
  registerWidget(commonApp);

  // 2) 注册扩展设置项
  const extension = app.extensionData.for('lady-byron-trends');

  extension
    .registerSetting({
      setting: 'lady-byron-trends.defaultLimit',
      label: app.translator.trans(
        'lady-byron-trends.admin.defaultLimit.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.defaultLimit.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.commentWeight',
      label: app.translator.trans(
        'lady-byron-trends.admin.commentWeight.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.commentWeight.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.participantWeight',
      label: app.translator.trans(
        'lady-byron-trends.admin.participantWeight.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.participantWeight.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.viewWeight',
      label: app.translator.trans(
        'lady-byron-trends.admin.viewWeight.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.viewWeight.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.daysLimit',
      label: app.translator.trans(
        'lady-byron-trends.admin.daysLimit.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.daysLimit.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.gravity',
      label: app.translator.trans(
        'lady-byron-trends.admin.gravity.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.gravity.help'
      ),
      type: 'number',
    })
    .registerSetting({
      setting: 'lady-byron-trends.limit',
      label: app.translator.trans(
        'lady-byron-trends.admin.widget_limit.label'
      ),
      help: app.translator.trans(
        'lady-byron-trends.admin.widget_limit.help'
      ),
      type: 'number',
    });
});

