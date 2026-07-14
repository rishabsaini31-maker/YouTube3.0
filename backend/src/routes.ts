import { Router } from 'express';
import * as channelsId from './controllers/channels_id';
import * as comments from './controllers/comments';
import * as commentsId from './controllers/comments_id';
import * as commentsModeration from './controllers/comments_moderation';
import * as commentsModerationId from './controllers/comments_moderation_id';
import * as downloads from './controllers/downloads';
import * as history from './controllers/history';
import * as likes from './controllers/likes';
import * as likesVideos from './controllers/likes_videos';
import * as memberships from './controllers/memberships';
import * as membershipsWebhook from './controllers/memberships_webhook';
import * as notifications from './controllers/notifications';
import * as notificationsIdRead from './controllers/notifications_id_read';
import * as plans from './controllers/plans';
import * as playlists from './controllers/playlists';
import * as playlistsId from './controllers/playlists_id';
import * as playlistsIdVideos from './controllers/playlists_id_videos';
import * as profile from './controllers/profile';
import * as search from './controllers/search';
import * as searchSuggestions from './controllers/search_suggestions';
import * as sessions from './controllers/sessions';
import * as sessionsId from './controllers/sessions_id';
import * as sessionsResendOtp from './controllers/sessions_resend-otp';
import * as sessionsVerifyOtp from './controllers/sessions_verify-otp';
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
import * as watchParty from './controllers/watch-party';
import * as watchPartyId from './controllers/watch-party_id';
import * as watchPartyIdJoin from './controllers/watch-party_id_join';
import * as watchPartyIdMessages from './controllers/watch-party_id_messages';
import * as yourVideos from './controllers/your-videos';

const router = Router();

// Helper to bind controller methods safely
const bindRoute = (controller: any) => {
  return (req: any, res: any, next: any) => {
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
router.all('/comments/moderation', bindRoute(commentsModeration));
router.all('/comments/moderation/:id', bindRoute(commentsModerationId));
router.all('/comments/:id', bindRoute(commentsId));
router.all('/downloads', bindRoute(downloads));
router.all('/history', bindRoute(history));
router.all('/likes', bindRoute(likes));
router.all('/likes/videos', bindRoute(likesVideos));
router.all('/memberships', bindRoute(memberships));
router.all('/memberships/webhook', bindRoute(membershipsWebhook));
router.all('/notifications', bindRoute(notifications));
router.all('/notifications/:id/read', bindRoute(notificationsIdRead));
router.all('/plans', bindRoute(plans));
router.all('/playlists', bindRoute(playlists));
router.all('/playlists/:id', bindRoute(playlistsId));
router.all('/playlists/:id/videos', bindRoute(playlistsIdVideos));
router.all('/profile', bindRoute(profile));
router.all('/search', bindRoute(search));
router.all('/search/suggestions', bindRoute(searchSuggestions));
router.all('/sessions', bindRoute(sessions));
router.all('/sessions/:id', bindRoute(sessionsId));
router.all('/sessions/resend-otp', bindRoute(sessionsResendOtp));
router.all('/sessions/verify-otp', bindRoute(sessionsVerifyOtp));
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
router.all('/watch-party', bindRoute(watchParty));
router.all('/watch-party/:id', bindRoute(watchPartyId));
router.all('/watch-party/:id/join', bindRoute(watchPartyIdJoin));
router.all('/watch-party/:id/messages', bindRoute(watchPartyIdMessages));
router.all('/your-videos', bindRoute(yourVideos));

export default router;
