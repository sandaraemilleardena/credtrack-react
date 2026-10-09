export const CREDENTIAL_PRINT_CSS = '@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white}.credential-print-page{width:194mm;height:281mm;display:flex;align-items:center;justify-content:center;break-after:page;page-break-after:always;break-inside:avoid}.credential-print-page:last-child{break-after:auto;page-break-after:auto}.credential-print-page img{width:100%;height:100%;object-fit:contain}';
export async function printCredentialPages(images, title) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups to open the credential print preview.');
  try {
    const doc = popup.document;
    doc.title = title;
    const style = doc.createElement('style');
    style.textContent = CREDENTIAL_PRINT_CSS;
    doc.head.append(style);
    await Promise.all(images.map(async page => {
      const section = doc.createElement('section');
      section.className = 'credential-print-page';
      const image = doc.createElement('img');
      image.alt = page.title;
      image.src = page.url;
      section.append(image);
      doc.body.append(section);
      await image.decode();
    }));
    popup.focus();
    popup.print();
  } catch (error) {
    popup.close();
    throw error;
  }
}
