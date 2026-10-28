import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";

@Pipe({
  name: "safeUrl",
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(videoId: string): SafeResourceUrl {
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
      throw new Error("Identificador de vídeo no válido.");
    const fullUrl = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
  }
}
