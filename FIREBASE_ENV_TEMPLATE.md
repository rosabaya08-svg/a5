# Firebase Environment Template

Create `.env.local` in this project and fill values from Firebase Console > Project settings > Your apps > Web app.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=a5-closed-mall.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=a5-closed-mall
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=a5-closed-mall.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

The live CMS code uses these collections:

- `banner_campaigns`
- `ad_video_campaigns`
- `product_detail_pages`
- `theme_configs`
- `content_targets`
- `media_assets`

Storage upload paths:

- `cms/banner_campaigns/{recordId}/{fileName}`
- `cms/ad_video_campaigns/{recordId}/{fileName}`
- `cms/product_detail_pages/{recordId}/{fileName}`
- `cms/theme_configs/{recordId}/{fileName}`
- `cms/content_targets/{recordId}/{fileName}`
