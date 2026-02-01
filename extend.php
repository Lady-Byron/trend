<?php

namespace Liplum\Trends;

use Flarum\Extend;
use Liplum\Trends\Controller\TrendsRecentController;

return [
    // Forum 前端：加载 widget 等
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    // Admin 前端：设置界面
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    // API 路由：/api/trends/recent
    (new Extend\Routes('api'))
        ->get(
            '/trends/recent',
            'lady-byron-trends.recent-trends',
            TrendsRecentController::class
        ),

    // 语言包
    new Extend\Locales(__DIR__ . '/locale'),

    // 设置：趋势算法参数 + Widget 显示数量（并序列化给 forum）
    (new Extend\Settings())
        ->default('lady-byron-trends.defaultLimit', 10)
        ->default('lady-byron-trends.commentWeight', 1.0)
        ->default('lady-byron-trends.participantWeight', 0.8)
        ->default('lady-byron-trends.viewWeight', 0.5)
        ->default('lady-byron-trends.daysLimit', 30)
        ->default('lady-byron-trends.gravity', 1.5)
        ->default('lady-byron-trends.limit', 5)
        ->serializeToForum('lady-byron-trends.limit', 'lady-byron-trends.limit'),
];
