export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");
}

export const MARK_ASSET_URL = assetUrl("images/game/mark.png");
export const MARK_CONFIRMED_ASSET_URL = assetUrl("images/game/mark-confirmed.png");
export const BOMB_ASSET_URL = assetUrl("images/game/bomb.png");
export const EXPLOSION_ASSET_URL = assetUrl("images/game/explosion.png");
export const LEVEL_COMPLETE_ASSET_URL = assetUrl("images/game/level-complete.png");

export const GESTURE_HINT_KEY = "blindsweeper:gesture-hint-dismissed";
export const HOWTO_SEEN_KEY = "blindsweeper:howto-seen";
