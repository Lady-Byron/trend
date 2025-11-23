<?php

namespace Liplum\Trends\Controller;

use Carbon\Carbon;
use Flarum\Api\Controller\AbstractListController;
use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Discussion\Discussion;
use Flarum\Discussion\DiscussionRepository;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class TrendsRecentController extends AbstractListController
{
    /** 使用 DiscussionSerializer 输出标准 discussions 资源 */
    public $serializer = DiscussionSerializer::class;

    /** 默认 include：作者、标签、阅读状态 */
    public $include = ['user', 'tags', 'state'];

    protected SettingsRepositoryInterface $settings;
    protected DiscussionRepository $discussions;

    public function __construct(
        SettingsRepositoryInterface $settings,
        DiscussionRepository $discussions
    ) {
        $this->settings   = $settings;
        $this->discussions = $discussions;
    }

    /**
     * @param ServerRequestInterface $request
     * @param Document               $document
     * @return \Illuminate\Support\Collection<Discussion>
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);

        // 让 state 关系按当前用户加载（lastReadPostNumber / 自定义阅读字段用）
        Discussion::setStateUser($actor);

        $queryParams = $request->getQueryParams();

        $limit = $this->getFilteredParam(
            $queryParams,
            'limit',
            (int) $this->settings->get('liplum-trends.defaultLimit', 10)
        );

        // 权重设置
        $commentWeight     = (float) $this->settings->get('liplum-trends.commentWeight', 1.0);
        $participantWeight = (float) $this->settings->get('liplum-trends.participantWeight', 0.8);
        $viewWeight        = (float) $this->settings->get('liplum-trends.viewWeight', 0.5);
        $daysLimit         = (int) $this->settings->get('liplum-trends.daysLimit', 30);
        $hoursLimit        = max($daysLimit * 24, 1);

        $now       = Carbon::now();
        $threshold = (clone $now)->subHours($hoursLimit);

        $query = $this->discussions->query()
            ->select('discussions.*')
            ->whereNull('hidden_at')
            ->where('is_private', 0)
            ->where('is_locked', 0)
            ->where('created_at', '>=', $threshold)
            ->selectRaw(
                '(? * comment_count) + (? * participant_count) + (? * view_count) * POW(1 - (TIMESTAMPDIFF(HOUR, created_at, ?) / ?), 2) as trending_score',
                [$commentWeight, $participantWeight, $viewWeight, $now, $hoursLimit]
            )
            // 权限过滤：仅返回当前用户可见的讨论
            ->whereVisibleTo($actor)
            ->orderByDesc('trending_score')
            ->take($limit);

        // AbstractListController 会根据 $include 自动 eager load 关系
        return $query->get();
    }

    protected function getFilteredParam(array $queryParams, string $key, $default)
    {
        return filter_var(
            Arr::get($queryParams, $key, $default),
            FILTER_VALIDATE_INT,
            ['options' => ['default' => $default]]
        );
    }
}

