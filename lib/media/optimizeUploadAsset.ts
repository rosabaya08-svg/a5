export type UploadAssetKind = "auto" | "image" | "video";

export type UploadAssetMetrics = {
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
};

export type OptimizedUploadAsset = {
  file: File;
  previewUrl: string;
  original: UploadAssetMetrics;
  optimized: UploadAssetMetrics;
  reductionRatio: number;
  notes: string[];
};

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1080;
const VIDEO_MAX_WIDTH = 1280;
const VIDEO_MAX_HEIGHT = 720;
const VIDEO_FPS = 24;
const VIDEO_BITRATE = 2_200_000;

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "upload"}.${extension}`;
}

function reductionRatio(originalSize: number, optimizedSize: number) {
  if (!originalSize) return 0;
  return Math.max(0, Math.round((1 - optimizedSize / originalSize) * 100));
}

function originalAsset(file: File, metrics: Partial<UploadAssetMetrics> = {}, note?: string): OptimizedUploadAsset {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    original: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      ...metrics,
    },
    optimized: {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      ...metrics,
    },
    reductionRatio: 0,
    notes: note ? [note] : [],
  };
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImage(file: File): Promise<OptimizedUploadAsset> {
  if (file.type === "image/gif") {
    return originalAsset(file, {}, "GIF는 움직임 보존을 위해 원본으로 업로드합니다.");
  }

  const { image, width, height } = await loadImage(file);
  const fitted = fitWithin(width, height, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT);
  const canvas = document.createElement("canvas");
  canvas.width = fitted.width;
  canvas.height = fitted.height;

  const context = canvas.getContext("2d");
  if (!context) {
    return originalAsset(file, { width, height }, "브라우저 이미지 최적화를 사용할 수 없어 원본으로 업로드합니다.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, fitted.width, fitted.height);

  const webpBlob = await canvasToBlob(canvas, "image/webp", 0.82);
  const jpegBlob = webpBlob ?? (await canvasToBlob(canvas, "image/jpeg", 0.86));

  if (!jpegBlob) {
    return originalAsset(file, { width, height }, "이미지 최적화 파일을 만들 수 없어 원본으로 업로드합니다.");
  }

  const outputType = webpBlob ? "image/webp" : "image/jpeg";
  const extension = webpBlob ? "webp" : "jpg";

  if (jpegBlob.size >= file.size && fitted.width === width && fitted.height === height) {
    return originalAsset(file, { width, height }, "원본이 이미 최적 크기라 그대로 업로드합니다.");
  }

  const optimizedFile = new File([jpegBlob], replaceExtension(file.name, extension), {
    type: outputType,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    previewUrl: URL.createObjectURL(optimizedFile),
    original: { name: file.name, type: file.type || "image/*", size: file.size, width, height },
    optimized: {
      name: optimizedFile.name,
      type: optimizedFile.type,
      size: optimizedFile.size,
      width: fitted.width,
      height: fitted.height,
    },
    reductionRatio: reductionRatio(file.size, optimizedFile.size),
    notes: [`${fitted.width}x${fitted.height} 규격으로 저장합니다.`],
  };
}

function loadVideo(file: File) {
  return new Promise<{ video: HTMLVideoElement; url: string; width: number; height: number; duration: number }>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        video,
        url,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상을 읽을 수 없습니다."));
    };
    video.src = url;
  });
}

function preferredVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function optimizeVideo(file: File): Promise<OptimizedUploadAsset> {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
    return originalAsset(file, {}, "현재 브라우저가 영상 최적화를 지원하지 않아 원본으로 업로드합니다.");
  }

  const { video, url, width, height, duration } = await loadVideo(file);
  const fitted = fitWithin(width, height, VIDEO_MAX_WIDTH, VIDEO_MAX_HEIGHT);
  const canvas = document.createElement("canvas");
  canvas.width = fitted.width;
  canvas.height = fitted.height;

  const context = canvas.getContext("2d");
  const mimeType = preferredVideoMimeType();
  if (!context || !mimeType) {
    URL.revokeObjectURL(url);
    return originalAsset(file, { width, height, duration }, "현재 브라우저가 지원하는 영상 저장 형식이 없어 원본으로 업로드합니다.");
  }

  const stream = canvas.captureStream(VIDEO_FPS);

  try {
    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
      });
      let animationFrame = 0;

      const stopTracks = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };

      const drawFrame = () => {
        context.drawImage(video, 0, 0, fitted.width, fitted.height);
        if (!video.ended && !video.paused) {
          animationFrame = requestAnimationFrame(drawFrame);
        }
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopTracks();
        reject(new Error("영상 최적화 중 오류가 발생했습니다."));
      };
      recorder.onstop = () => {
        stopTracks();
        resolve(new Blob(chunks, { type: mimeType }));
      };
      video.onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.start(1000);
      video.currentTime = 0;
      video
        .play()
        .then(() => {
          drawFrame();
        })
        .catch((error: unknown) => {
          stopTracks();
          reject(error instanceof Error ? error : new Error("영상 재생을 시작할 수 없습니다."));
        });
    });

    URL.revokeObjectURL(url);

    if (!optimizedBlob.size) {
      return originalAsset(file, { width, height, duration }, "영상 최적화 파일을 만들 수 없어 원본으로 업로드합니다.");
    }

    const optimizedFile = new File([optimizedBlob], replaceExtension(file.name, "webm"), {
      type: "video/webm",
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      previewUrl: URL.createObjectURL(optimizedFile),
      original: { name: file.name, type: file.type || "video/*", size: file.size, width, height, duration },
      optimized: {
        name: optimizedFile.name,
        type: optimizedFile.type,
        size: optimizedFile.size,
        width: fitted.width,
        height: fitted.height,
        duration,
      },
      reductionRatio: reductionRatio(file.size, optimizedFile.size),
      notes: [`${fitted.width}x${fitted.height}, ${VIDEO_FPS}fps 규격으로 저장합니다.`],
    };
  } catch {
    URL.revokeObjectURL(url);
    stream.getTracks().forEach((track) => track.stop());
    return originalAsset(file, { width, height, duration }, "영상 최적화에 실패해 원본으로 업로드합니다.");
  }
}

export async function optimizeUploadAsset(file: File, kind: UploadAssetKind = "auto") {
  const inferredKind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "auto";
  const targetKind = kind === "auto" ? inferredKind : kind;

  if (targetKind === "video" && file.type.startsWith("video/")) {
    return optimizeVideo(file);
  }

  if (file.type.startsWith("image/")) {
    return optimizeImage(file);
  }

  return originalAsset(file, {}, "지원하지 않는 파일 형식은 원본으로 업로드합니다.");
}
