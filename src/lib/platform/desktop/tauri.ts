import { showToast } from "@/shared/ui/ui-lib";
import Locale from "@/app/locales";

export function clientUpdate() {
  // this a wild for updating client app
  return (window as any).__TAURI__?.updater
    .checkUpdate()
    .then((updateResult: any) => {
      if (updateResult.shouldUpdate) {
        (window as any).__TAURI__?.updater
          .installUpdate()
          .then((result: any) => {
            showToast(Locale.Settings.Update.Success);
          })
          .catch((e: any) => {
            console.error("[Install Update Error]", e);
            showToast(Locale.Settings.Update.Failed);
          });
      }
    })
    .catch((e: any) => {
      console.error("[Check Update Error]", e);
      showToast(Locale.Settings.Update.Failed);
    });
}
