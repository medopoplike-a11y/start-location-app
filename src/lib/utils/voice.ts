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
   * Play a standard notification sound
   */
  public playSound(type: 'success' | 'alert' | 'notification' | 'error' = 'notification') {
    if (!this.isEnabled) return;
    
    let url = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3"; // Default notification
    
    switch(type) {
      case 'success':
        url = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
        break;
      case 'alert':
        url = "https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3";
        break;
      case 'error':
        url = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";
        break;
    }

    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn("Audio play blocked by browser", e));
    } catch (e) {
      console.error("Audio playback error", e);
    }
  }

  /**
   * Announce a new order to the driver
   */
  public announceNewOrder(orderId: string, area?: string) {
    this.playSound('alert');
    const text = area 
      ? `طلب جديد في منطقة ${area}. رقم الطلب ${orderId.slice(-4)}`
      : `لديك طلب توصيل جديد. رقم الطلب ${orderId.slice(-4)}`;
    this.speak(text, { priority: 'high', rate: 0.9 });
  }

  /**
   * Announce order status change
   */
  public announceStatusChange(orderId: string, status: string, role: 'driver' | 'store' | 'admin' = 'driver') {
    let statusText = status;
    let soundType: 'success' | 'notification' | 'alert' = 'notification';

    if (role === 'driver') {
      switch(status) {
        case 'picked_up': 
          statusText = 'تم الاستلام من المتجر، بالتوفيق في الطريق'; 
          soundType = 'success';
          break;
        case 'delivered': 
          statusText = 'تم التوصيل بنجاح، مبروك يا كابتن'; 
          soundType = 'success';
          break;
        case 'cancelled': 
          statusText = 'تم إلغاء الطلب من قبل النظام'; 
          soundType = 'alert';
          break;
        case 'assigned':
          statusText = 'تم تعيين طلب جديد لك';
          soundType = 'success';
          break;
      }
    } else if (role === 'store') {
      switch(status) {
        case 'assigned': 
          statusText = `تم قبول الطلب رقم ${orderId.slice(-4)} من قبل أحد الكباتن وهو في الطريق إليك`;
          soundType = 'success';
          break;
        case 'delivered':
          statusText = `الطلب رقم ${orderId.slice(-4)} وصل للعميل بسلام`;
          soundType = 'success';
          break;
        case 'cancelled':
          statusText = `تم إلغاء الطلب رقم ${orderId.slice(-4)}`;
          soundType = 'alert';
          break;
        case 'picked_up':
          statusText = `الكابتن استلم الطلب رقم ${orderId.slice(-4)} وهو في طريقه للعميل`;
          soundType = 'notification';
          break;
      }
    } else {
      // Admin
      switch(status) {
        case 'delivered': statusText = `الطلب ${orderId.slice(-4)} تم توصيله`; break;
        case 'cancelled': statusText = `الطلب ${orderId.slice(-4)} تم إلغاؤه`; break;
        case 'assigned': statusText = `الطلب ${orderId.slice(-4)} تم تعيينه لكابتن`; break;
        case 'in_transit': statusText = `الطلب ${orderId.slice(-4)} في الطريق الآن`; break;
      }
    }
    
    this.playSound(soundType);
    const text = statusText;
    this.speak(text, { priority: role === 'driver' ? 'high' : 'normal' });
  }

  /**
   * Store specific: Driver accepted order
   */
  public announceDriverAccepted(driverName: string, orderId: string) {
    this.playSound('success');
    this.speak(`الكابتن ${driverName} قبل الطلب رقم ${orderId.slice(-4)} وهو في الطريق إليك`, { priority: 'high' });
  }

  /**
   * Admin specific: Critical system alert
   */
  public announceSystemAlert(message: string) {
    this.playSound('error');
    this.speak(`تنبيه للنظام: ${message}`, { priority: 'high', rate: 0.85 });
  }

  /**
   * Admin specific: New order received
   */
  public announceNewOrderAdmin(orderId: string, vendorName: string) {
    this.playSound('notification');
    this.speak(`وصل طلب جديد من ${vendorName}. رقم الطلب ${orderId.slice(-4)}`, { priority: 'normal' });
  }

  /**
   * AI Insight alert
   */
  public announceInsight(content: string) {
    this.speak(`تنبيه ذكي: ${content}`, { rate: 0.95 });
  }
}

export const aiVoice = VoiceAssistant.getInstance();
