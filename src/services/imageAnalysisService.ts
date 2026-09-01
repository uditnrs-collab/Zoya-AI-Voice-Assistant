// Image Understanding & OCR Service for ZOYA

export interface ImageAnalysisState {
  currentImageDataUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isAnalyzing: boolean;
  ocrText: string | null;
  latestSummary: string | null;
  qaHistory: Array<{ role: "user" | "zoya"; text: string; timestamp: number }>;
  error: string | null;
}

type ImageAnalysisListener = (state: ImageAnalysisState) => void;

class ImageAnalysisManager {
  private state: ImageAnalysisState = {
    currentImageDataUrl: null,
    fileName: null,
    fileSize: null,
    isAnalyzing: false,
    ocrText: null,
    latestSummary: null,
    qaHistory: [],
    error: null,
  };

  private listeners: Set<ImageAnalysisListener> = new Set();

  public subscribe(listener: ImageAnalysisListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public hasImage(): boolean {
    return !!this.state.currentImageDataUrl;
  }

  public getCurrentImage(): string | null {
    return this.state.currentImageDataUrl;
  }

  public async loadImageFromFile(file: File): Promise<{ success: boolean; message: string }> {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase()) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      const errMsg = "Sirf JPG, PNG aur WEBP image formats supported hain.";
      this.state.error = errMsg;
      this.notify();
      return { success: false, message: errMsg };
    }

    // 10MB size limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const errMsg = "Image size 10MB se kam honi chahiye.";
      this.state.error = errMsg;
      this.notify();
      return { success: false, message: errMsg };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          const errMsg = "Image read karne me dikkat aayi.";
          this.state.error = errMsg;
          this.notify();
          resolve({ success: false, message: errMsg });
          return;
        }

        this.state.currentImageDataUrl = dataUrl;
        this.state.fileName = file.name;
        this.state.fileSize = file.size;
        this.state.error = null;
        this.state.ocrText = null;
        this.state.latestSummary = null;
        this.state.qaHistory = [];
        this.notify();

        // Automatically trigger initial analysis
        const analysis = await this.analyzeImage("Is image me kya hai? Iske main objects, visual content aur kisi visible text ko summarize kijiye.");
        resolve({ success: true, message: analysis.text });
      };

      reader.onerror = () => {
        const errMsg = "File upload fail ho gaya.";
        this.state.error = errMsg;
        this.notify();
        resolve({ success: false, message: errMsg });
      };

      reader.readAsDataURL(file);
    });
  }

  public async analyzeImage(prompt: string = "Analyze this image and explain what you see in detail."): Promise<{ success: boolean; text: string }> {
    if (!this.state.currentImageDataUrl) {
      return {
        success: false,
        text: "Boss, pehle koi image upload kijiye.",
      };
    }

    this.state.isAnalyzing = true;
    this.state.qaHistory.push({ role: "user", text: prompt, timestamp: Date.now() });
    this.notify();

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: this.state.currentImageDataUrl,
          prompt,
          type: "image-analysis",
        }),
      });

      const data = await res.json();
      const answer = data.text || "Boss, image analyze ho gayi hai.";

      this.state.isAnalyzing = false;
      this.state.latestSummary = answer;
      this.state.qaHistory.push({ role: "zoya", text: answer, timestamp: Date.now() });
      this.state.error = null;
      this.notify();

      return { success: true, text: answer };
    } catch (err: any) {
      console.error("Image analysis error:", err);
      const errAnswer = "Ji boss, image analyze karne me samasya aayi. Kripya dobara try karein.";
      this.state.isAnalyzing = false;
      this.state.error = err.message || "Failed to analyze image";
      this.state.qaHistory.push({ role: "zoya", text: errAnswer, timestamp: Date.now() });
      this.notify();

      return { success: false, text: errAnswer };
    }
  }

  public async extractOCRText(): Promise<{ success: boolean; text: string }> {
    return this.analyzeImage(
      "Extract and transcribe all readable text present inside this image accurately (OCR). Keep the original formatting and list any headers, paragraphs, or tabular text clearly."
    );
  }

  public clearImage() {
    this.state = {
      currentImageDataUrl: null,
      fileName: null,
      fileSize: null,
      isAnalyzing: false,
      ocrText: null,
      latestSummary: null,
      qaHistory: [],
      error: null,
    };
    this.notify();
  }
}

export const imageAnalysisService = new ImageAnalysisManager();
