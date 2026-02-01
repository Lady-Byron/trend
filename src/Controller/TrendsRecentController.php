<?php

namespace Liplum\Trends\Controller;

use Carbon\Carbon;
use Flarum\Api\Controller\AbstractListController;
use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Discussion\Discussion;
use Flarum\Discussion\DiscussionRepository;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class TrendsRecentController extends AbstractListController
{
    public $serializer = DiscussionSerializer::class;

    public $include = ['user', 'tags', 'state'];

    private const MAX_LIMIT = 50;

    protected SettingsRepositoryInterface $settings;
    protected DiscussionRepository $discussions;
    protected ConnectionInterface $db;

    private static ?bool $hasViewCount = null;

    public function __construct(
        SettingsRepositoryInterface $settings,
        DiscussionRepository $discussions,
        ConnectionInterface $db
    ) {
        $this->settings    = $settings;
        $this->discussions = $discussions;
        $this->db          = $db;
    }

    /**
     * @param ServerRequestInterface $request
     * @param Document               $document
     * @return \Illuminate\Support\Collection<Discussion>
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertCan('viewForum');

        Discussion::setStateUser($actor);

        $queryParams = $request->getQueryParams();

        $limit = $this->getFilteredParam(
            $queryParams,
            'limit',
            (int) $this->settings->get('lady-byron-trends.defaultLimit', 10)
        );
        $limit = min(max($limit, 1), self::MAX_LIMIT);

        $commentWeight     = (float) $this->settings->get('lady-byron-trends.commentWeight', 1.0);
        $participantWeight = (float) $this->settings->get('lady-byron-trends.participantWeight', 0.8);
        $viewWeight        = (float) $this->settings->get('lady-byron-trends.viewWeight', 0.5);
        $gravity           = (float) $this->settings->get('lady-byron-trends.gravity', 1.5);
        $daysLimit         = max((int) $this->settings->get('lady-byron-trends.daysLimit', 30), 1);

        $now       = Carbon::now();
        $threshold = (clone $now)->subDays($daysLimit);

        $hasViewCount = $this->hasViewCountColumn();

        if ($hasViewCount) {
            $scoreSql = 'LOG(1 + ? * comment_count + ? * participant_count + ? * view_count)'
                      . ' / POW(TIMESTAMPDIFF(HOUR, COALESCE(last_posted_at, created_at), ?) + 2, ?)';
            $bindings = [$commentWeight, $participantWeight, $viewWeight, $now, $gravity];
        } else {
            $scoreSql = 'LOG(1 + ? * comment_count + ? * participant_count)'
                      . ' / POW(TIMESTAMPDIFF(HOUR, COALESCE(last_posted_at, created_at), ?) + 2, ?)';
            $bindings = [$commentWeight, $participantWeight, $now, $gravity];
        }

        $query = $this->discussions->query()
            ->select('discussions.*')
            ->whereNull('hidden_at')
            ->where('is_private', 0)
            ->where('created_at', '>=', $threshold)
            ->selectRaw("$scoreSql as trending_score", $bindings)
            ->whereVisibleTo($actor)
            ->orderByDesc('trending_score')
            ->take($limit);

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

    private function hasViewCountColumn(): bool
    {
        if (self::$hasViewCount === null) {
            self::$hasViewCount = $this->db
                ->getSchemaBuilder()
                ->hasColumn('discussions', 'view_count');
        }

        return self::$hasViewCount;
    }
}
