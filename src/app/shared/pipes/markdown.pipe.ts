import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Pipe que convierte texto Markdown a HTML seguro para renderizar
 * en el chat del Coach IA (tablas, negritas, listas, encabezados, etc.).
 *
 * Uso: {{ message.texto | markdown }}
 */
@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    marked.setOptions({
      breaks: true,   // Saltos de línea simples → <br>
      gfm: true,      // GitHub Flavored Markdown (tablas, tachado, etc.)
    });
  }

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }
    let html = marked.parse(value) as string;
    // Envolver tablas en contenedor scrollable para pantallas pequeñas
    html = html.replace(
      /<table>/g,
      '<div class="table-wrap"><table>'
    ).replace(
      /<\/table>/g,
      '</table></div>'
    );
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
