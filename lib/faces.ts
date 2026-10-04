type ImageUris = {
  large?: string;
  normal?: string;
  art_crop?: string;
};

type CardFace = {
  name?: string;
  image_uris?: ImageUris;
};

export type FaceImages = {
  imageUrl: string;
  artCropUrl: string;
  backImageUrl?: string;
  backName?: string;
};

export function faceImages(card: { image_uris?: ImageUris; card_faces?: CardFace[] }): FaceImages {
  const faces = card.card_faces ?? [];
  const front = card.image_uris ?? faces[0]?.image_uris;
  const backUris = faces.length > 1 ? faces[1]?.image_uris : undefined;
  const backImageUrl = backUris?.large || backUris?.normal || "";
  return {
    imageUrl: front?.large || front?.normal || "",
    artCropUrl: front?.art_crop || front?.normal || front?.large || "",
    ...(backImageUrl
      ? { backImageUrl, backName: faces[1]?.name?.trim() || undefined }
      : {}),
  };
}
