import { Router } from 'express';
import * as channelsId from './controllers/channels_id';
import * as comments from './controllers/comments';
import * as commentsId from './controllers/comments_id';
import * as history from './controllers/history';
import * as likes from './controllers/likes';
import * as likesVideos from './controllers/likes_videos';
import * as profile from './controllers/profile';
import * as search from './controllers/search';
import * as searchSuggestions from './controllers/search_suggestions';
import * as subscriptions from './controllers/subscriptions';
import * as subscriptionsChannels from './controllers/subscriptions_channels';
import * as subscriptionsVideos from './controllers/subscriptions_videos';
import * as upload from './controllers/upload';
import * as videos from './controllers/videos';
import * as videosId from './controllers/videos_id';
import * as videosStreamId from './controllers/videos_stream_id';
import * as videosViews from './controllers/videos_views';
import * as watchLater from './controllers/watch-later';
import * as watchLaterId from './controllers/watch-later_id';
import * as yourVideos from './controllers/your-videos';

const router = Router();

// Helper to bind controller methods safely
const bindRoute = (controller: any) => {
  return (req: any, res: any, next: any) => {
    // If the controller exports GET/POST etc
    const method = req.method;
    if (controller[method]) {
      return controller[method](req, res).catch(next);
    }
    res.status(405).json({ error: 'Method not allowed' });
  };
};

// Map routes
router.all('/channels/:id', bindRoute(channelsId));
router.all('/comments', bindRoute(comments));
router.all('/comments/:id', bindRoute(commentsId));
router.all('/history', bindRoute(history));
router.all('/likes', bindRoute(likes));
router.all('/likes/videos', bindRoute(likesVideos));
router.all('/profile', bindRoute(profile));
router.all('/search', bindRoute(search));
router.all('/search/suggestions', bindRoute(searchSuggestions));
router.all('/subscriptions', bindRoute(subscriptions));
router.all('/subscriptions/channels', bindRoute(subscriptionsChannels));
router.all('/subscriptions/videos', bindRoute(subscriptionsVideos));
router.all('/upload', bindRoute(upload));
router.all('/videos', bindRoute(videos));
router.all('/videos/:id', bindRoute(videosId));
router.all('/videos/stream/:id', bindRoute(videosStreamId));
router.all('/videos/views', bindRoute(videosViews));
router.all('/watch-later', bindRoute(watchLater));
router.all('/watch-later/:id', bindRoute(watchLaterId));
router.all('/your-videos', bindRoute(yourVideos));

export default router;
