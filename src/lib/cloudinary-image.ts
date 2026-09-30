export function optimizedImageUrl(imageUrl: string, width: number) {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return imageUrl;

    const uploadPath = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadPath);
    if (uploadIndex < 0) return imageUrl;

    const pathAfterUpload = url.pathname.slice(uploadIndex + uploadPath.length);
    const firstSegment = pathAfterUpload.split("/")[0] ?? "";
    if (/(^|,)(f_auto|q_auto|w_\d+|c_limit)(,|$)/.test(firstSegment)) return imageUrl;

    url.pathname = `${url.pathname.slice(0, uploadIndex + uploadPath.length)}f_auto,q_auto:good,c_limit,w_${width}/${pathAfterUpload}`;
    return url.toString();
  } catch {
    return imageUrl;
  }
}