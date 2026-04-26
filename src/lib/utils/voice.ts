/**
 * AI Voice Assistant Utility - V19.3.0
 * Handles Text-to-Speech (TTS) for critical app alerts and AI-driven voice feedback.
 */

export interface VoiceOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  priority?: 'high' | 'normal';
}

class VoiceAssistant {
  private static instance: VoiceAssistant;
  private synth: SpeechSynthesis | null = null;
  private queue: Array<{ text: string; options: VoiceOptions }> = [];
  private isSpeaking: boolean = false;
  private isEnabled: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public static getInstance(): VoiceAssistant {
    if (!VoiceAssistant.instance) {
      VoiceAssistant.instance = new VoiceAssistant();
    }
    return VoiceAssistant.instance;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Speak a text message using AI-driven TTS
   */
  public speak(text: string, options: VoiceOptions = {}) {
    if (!this.isEnabled || !this.synth) return;

    const defaultOptions: VoiceOptions = {
      lang: 'ar-SA',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      priority: 'normal'
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (mergedOptions.priority === 'high') {
      this.synth.cancel();
      this.queue = [];
    }

    this.queue.push({ text, options: mergedOptions });
    this.processQueue();
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0 || !this.synth) return;

    this.isSpeaking = true;
    const item = this.queue.shift()!;
    const utterance = new SpeechSynthesisUtterance(item.text);
    
    utterance.lang = item.options.lang || 'ar-SA';
    utterance.rate = item.options.rate || 1.0;
    utterance.pitch = item.options.pitch || 1.0;
    utterance.volume = item.options.volume || 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    utterance.onerror = (event) => {
      console.error('VoiceAssistant: Speech synthesis error', event);
      this.isSpeaking = false;
      this.processQueue();
    };

    this.synth.speak(utterance);
  }

  /**
   * Announce a new order to the driver
   */
  public announceNewOrder(orderId: string, area?: string) {
    const text = area 
      ? `طلب جديد في منطقة ${area}. رقم الطلب ${orderId.slice(-4)}`
      : `لديك طلب توصيل جديد. رقم الطلب ${orderId.slice(-4)}`;
    this.speak(text, { priority: 'high', rate: 0.9 });
  }

  /**
   * Announce order status change
   */
  public announceStatusChange(orderId: string, status: string) {
    let statusText = status;
    switch(status) {
      case 'picked_up': statusText = 'تم الاستلام'; break;
      case 'delivered': statusText = 'تم التوصيل بنجاح'; break;
      case 'cancelled': statusText = 'تم إلغاء الطلب'; break;
    }
    const text = `الطلب رقم ${orderId.slice(-4)} أصبح ${statusText}`;
    this.speak(text);
  }

  /**
   * AI Insight alert
   */
  public announceInsight(content: string) {
    this.speak(`تنبيه ذكي: ${content}`, { rate: 0.95 });
  }
}

export const aiVoice = VoiceAssistant.getInstance();
