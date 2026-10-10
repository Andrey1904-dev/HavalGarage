/**
 * Минимальные объявления типов для pdfmake: библиотека поставляется
 * UMD-бандлами без типов, а подключается лениво (только при экспорте PDF),
 * поэтому полное описание API здесь не требуется.
 */
declare module 'pdfmake/build/pdfmake.min.js' {
  interface PdfMakeDocument {
    download(filename?: string): void
    open(): void
    print(): void
    getBlob(): Promise<Blob>
    getBase64(): Promise<string>
  }
  export interface PdfMakeType {
    vfs: Record<string, string>
    fonts: Record<string, Record<string, string>>
    createPdf(docDefinition: Record<string, unknown>): PdfMakeDocument
  }
  const pdfMake: PdfMakeType
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const vfsFonts: Record<string, string> & { pdfMake?: { vfs: Record<string, string> } }
  export default vfsFonts
}
