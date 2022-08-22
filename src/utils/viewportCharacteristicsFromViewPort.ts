import { IViewport, ViewportShape } from "apl-suggester";

function dpToPixel(dp: number, dpi: number): number {
  return Math.round((dpi / 160) * dp);
}

// viewport in apl-viewhost-web must be IViewportCharacteristics type.
// This method is to convert IViewportCharacteristics from IViewport
// https://github.com/alexa/apl-viewhost-web/blob/master/js/apl-html/src/APLRenderer.ts#L60
export function viewportCharacteristicsFromViewPort(
  targetViewport: IViewport
): any {
  return {
    isRound: targetViewport.shape === ViewportShape.ROUND,
    height: dpToPixel(targetViewport.height, targetViewport.dpi),
    width: dpToPixel(targetViewport.width, targetViewport.dpi),
    dpi: targetViewport.dpi,
  };
}
