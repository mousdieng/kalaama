import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LearnService } from '../services/learn.service';
import { VoiceService } from '../../../core/services/voice.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { SettingsService } from '../../../core/services/settings.service';
import type {
  ConversationUnit,
  VocabularyItem,
  PhrasePattern,
  ConversationTurn,
  ConversationPhase,
  ConversationTutorResponse,
} from '../../../../chrome/shared/types/messages';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson.component.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .mic-button {
      transition: all 0.3s ease;
    }

    .mic-button.listening {
      animation: pulse-ring 1.5s ease-out infinite;
    }

    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
      100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
    }

    .wave-animation {
      display: flex;
      gap: 4px;
      align-items: center;
      height: 24px;
    }

    .wave-bar {
      width: 4px;
      background: currentColor;
      border-radius: 2px;
      animation: wave 1s ease-in-out infinite;
    }

    .wave-bar:nth-child(1) { animation-delay: 0s; }
    .wave-bar:nth-child(2) { animation-delay: 0.1s; }
    .wave-bar:nth-child(3) { animation-delay: 0.2s; }
    .wave-bar:nth-child(4) { animation-delay: 0.3s; }
    .wave-bar:nth-child(5) { animation-delay: 0.4s; }

    @keyframes wave {
      0%, 100% { height: 8px; }
      50% { height: 24px; }
    }

    .chat-bubble {
      max-width: 85%;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .vocab-card {
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LessonComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learnService = inject(LearnService);
  private voiceService = inject(VoiceService);
  private messagingService = inject(MessagingService);
  private settingsService = inject(SettingsService);

  // Unit data
  unit: ConversationUnit | null = null;

  // Conversation phases
  phase: ConversationPhase = 'loading';
  error: string | null = null;

  // Vocabulary phase
  currentVocabIndex = 0;
  vocabMastered: Set<string> = new Set();

  // Phrases phase
  currentPhraseIndex = 0;
  phrasesCompleted: Set<string> = new Set();

  // Roleplay phase
  conversationHistory: ConversationTurn[] = [];
  conversationTurns = 0;

  // Voice state
  isListening = false;
  isProcessing = false;
  transcript = '';

  // AI response
  aiMessage = '';
  aiMessageInTargetLang = '';
  showCorrection = false;
  correction = '';
  encouragement = '';

  // Progress
  xpEarned = 0;
  startTime = 0;

  // Settings
  targetLanguage = 'de';
  nativeLanguage = 'fr';

  // Permission state
  needsManualGrant = false;
  permissionRetryCount = 0;

  // Computed
  get currentVocab(): VocabularyItem | null {
    if (!this.unit || this.currentVocabIndex >= this.unit.vocabulary.length) return null;
    return this.unit.vocabulary[this.currentVocabIndex];
  }

  get currentPhrase(): PhrasePattern | null {
    if (!this.unit || this.currentPhraseIndex >= this.unit.phrasePatterns.length) return null;
    return this.unit.phrasePatterns[this.currentPhraseIndex];
  }

  get vocabProgress(): number {
    if (!this.unit) return 0;
    return Math.round((this.currentVocabIndex / this.unit.vocabulary.length) * 100);
  }

  get vocabCoverage(): number {
    if (!this.unit) return 0;
    return Math.round((this.vocabMastered.size / this.unit.vocabulary.length) * 100);
  }

  get phraseProgress(): number {
    if (!this.unit) return 0;
    return Math.round((this.currentPhraseIndex / this.unit.phrasePatterns.length) * 100);
  }

  async ngOnInit(): Promise<void> {
    // Load settings
    const settings = await this.settingsService.waitForReady();
    if (settings) {
      this.targetLanguage = settings.target_language || 'de';
      this.nativeLanguage = settings.native_language || 'fr';
    }

    // Check mic permission via content script (runs on youtube.com)
    try {
      const permissionResult = await this.voiceService.ensurePermission();
      if (permissionResult.status !== 'granted') {
        this.phase = 'error';
        this.error = permissionResult.message;
        this.needsManualGrant = permissionResult.needsManualGrant || false;
        return;
      }
    } catch (err: any) {
      console.error('[Lesson] Permission check error:', err);
      this.phase = 'error';
      this.error = 'Veuillez ouvrir une vidéo YouTube pour utiliser les leçons vocales.';
      this.needsManualGrant = true;
      return;
    }

    // Get unit ID from route
    const unitId = this.route.snapshot.paramMap.get('id');
    if (!unitId) {
      this.phase = 'error';
      this.error = 'No unit ID provided';
      return;
    }

    await this.loadUnit(unitId);
  }

  ngOnDestroy(): void {
    this.voiceService.stopListening();
  }

  private async loadUnit(unitId: string): Promise<void> {
    this.phase = 'loading';

    try {
      const unit = await this.learnService.getConversationUnit(unitId, this.targetLanguage);

      if (!unit) {
        this.phase = 'error';
        this.error = 'Unit not found';
        return;
      }

      this.unit = unit;
      this.startTime = Date.now();

      // Start vocabulary phase
      await this.startVocabularyPhase();
    } catch (err) {
      console.error('[Lesson] Failed to load unit:', err);
      this.phase = 'error';
      this.error = 'Failed to load unit';
    }
  }

  // ============================================
  // VOCABULARY PHASE
  // ============================================

  private async startVocabularyPhase(): Promise<void> {
    this.phase = 'vocabulary';
    this.currentVocabIndex = 0;

    // Introduce first word
    await this.introduceCurrentVocab();
  }

  private async introduceCurrentVocab(): Promise<void> {
    if (!this.currentVocab) return;

    const vocab = this.currentVocab;
    // AI message in native language (French)
    this.aiMessage = `Le mot suivant est : "${vocab.word}" - ${vocab.translation}. Répétez après moi.`;

    // Play pronunciation in German
    await this.playTTS(vocab.word, this.targetLanguage);
  }

  async handleVocabResponse(): Promise<void> {
    if (!this.currentVocab || !this.transcript) return;

    this.isProcessing = true;
    const vocab = this.currentVocab;

    try {
      // Check pronunciation using AI
      const response = await this.getConversationTutorResponse('vocabulary');

      this.encouragement = response.encouragement;

      if (response.isCorrect) {
        this.vocabMastered.add(vocab.id);
        this.xpEarned += 2;
        this.aiMessage = response.text;

        // Move to next vocab after a delay
        setTimeout(() => {
          this.advanceVocab();
        }, 1500);
      } else {
        this.showCorrection = true;
        this.correction = vocab.word;
        this.aiMessage = response.text;

        // Play correct pronunciation again
        await this.playTTS(vocab.word, this.targetLanguage);
      }
    } catch (err) {
      console.error('[Lesson] Vocab response error:', err);
      this.aiMessage = 'Essayons encore une fois.';
    } finally {
      this.isProcessing = false;
    }
  }

  private advanceVocab(): void {
    if (!this.unit) return;

    this.showCorrection = false;
    this.correction = '';
    this.transcript = '';

    if (this.currentVocabIndex < this.unit.vocabulary.length - 1) {
      this.currentVocabIndex++;
      this.introduceCurrentVocab();
    } else {
      // All vocab done, move to phrases
      this.startPhrasePhase();
    }
  }

  retryVocab(): void {
    this.showCorrection = false;
    this.transcript = '';
    this.introduceCurrentVocab();
  }

  // ============================================
  // PHRASE PHASE
  // ============================================

  private async startPhrasePhase(): Promise<void> {
    this.phase = 'phrases';
    this.currentPhraseIndex = 0;

    // Introduce phrase building
    this.aiMessage = 'Excellent! Maintenant, construisons des phrases avec ces mots.';
    await this.playTTS(this.aiMessage, this.nativeLanguage);

    setTimeout(() => {
      this.introduceCurrentPhrase();
    }, 2000);
  }

  private async introduceCurrentPhrase(): Promise<void> {
    if (!this.currentPhrase) return;

    const phrase = this.currentPhrase;
    this.aiMessage = `${phrase.hint || 'Essayez de dire'}: "${phrase.pattern}" (${phrase.translation})`;

    // Play the pattern in German
    await this.playTTS(phrase.pattern.replace('___', ''), this.targetLanguage);
  }

  async handlePhraseResponse(): Promise<void> {
    if (!this.currentPhrase || !this.transcript) return;

    this.isProcessing = true;

    try {
      const response = await this.getConversationTutorResponse('phrases');

      this.encouragement = response.encouragement;
      this.aiMessage = response.text;

      if (response.isCorrect) {
        this.phrasesCompleted.add(this.currentPhrase.id);
        this.xpEarned += 3;

        setTimeout(() => {
          this.advancePhrase();
        }, 2000);
      } else if (response.correction) {
        this.showCorrection = true;
        this.correction = response.correction;
        await this.playTTS(response.correction, this.targetLanguage);
      }
    } catch (err) {
      console.error('[Lesson] Phrase response error:', err);
      this.aiMessage = 'Essayons encore une fois.';
    } finally {
      this.isProcessing = false;
    }
  }

  private advancePhrase(): void {
    if (!this.unit) return;

    this.showCorrection = false;
    this.correction = '';
    this.transcript = '';

    if (this.currentPhraseIndex < this.unit.phrasePatterns.length - 1) {
      this.currentPhraseIndex++;
      this.introduceCurrentPhrase();
    } else {
      // All phrases done, move to roleplay
      this.startRoleplayPhase();
    }
  }

  retryPhrase(): void {
    this.showCorrection = false;
    this.transcript = '';
    this.introduceCurrentPhrase();
  }

  // ============================================
  // ROLEPLAY PHASE
  // ============================================

  private async startRoleplayPhase(): Promise<void> {
    this.phase = 'roleplay';
    this.conversationHistory = [];
    this.conversationTurns = 0;

    if (!this.unit) return;

    const scenario = this.unit.roleplayScenario;

    // Show intro message
    this.aiMessage = `Maintenant, pratiquons dans une vraie conversation. ${scenario.scenario}`;
    await this.playTTS(this.aiMessage, this.nativeLanguage);

    // AI starts the conversation in German
    setTimeout(async () => {
      this.aiMessageInTargetLang = scenario.openingLine;
      this.conversationHistory.push({
        role: 'tutor',
        text: scenario.openingLine,
        timestamp: Date.now(),
      });
      await this.playTTS(scenario.openingLine, this.targetLanguage);
    }, 2000);
  }

  async handleRoleplayResponse(): Promise<void> {
    if (!this.transcript) return;

    this.isProcessing = true;

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      text: this.transcript,
      timestamp: Date.now(),
    });
    this.conversationTurns++;

    try {
      const response = await this.getConversationTutorResponse('roleplay');

      // Track vocab usage
      if (response.vocabUsed) {
        response.vocabUsed.forEach(id => this.vocabMastered.add(id));
      }

      // Show AI response
      this.aiMessageInTargetLang = response.textInTargetLanguage || response.text;
      this.aiMessage = response.isCorrect ? '' : response.text;
      this.encouragement = response.encouragement;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'tutor',
        text: response.textInTargetLanguage || response.text,
        timestamp: Date.now(),
      });

      // Award XP for participating
      this.xpEarned += response.isCorrect ? 5 : 2;

      // Play AI response in German
      await this.playTTS(response.textInTargetLanguage || response.text, this.targetLanguage);

      // Check if conversation should end
      if (response.shouldEndPhase || this.shouldEndRoleplay()) {
        setTimeout(() => {
          this.completeUnit();
        }, 3000);
      }

      // Show correction if any
      if (response.correction) {
        this.showCorrection = true;
        this.correction = response.correction;
      }
    } catch (err) {
      console.error('[Lesson] Roleplay response error:', err);
      this.aiMessageInTargetLang = 'Können Sie das wiederholen?';
    } finally {
      this.isProcessing = false;
      this.transcript = '';
    }
  }

  private shouldEndRoleplay(): boolean {
    if (!this.unit) return true;

    const maxTurns = this.unit.roleplayScenario.maxTurns || 10;
    const targetCoverage = this.unit.roleplayScenario.targetVocabUsage;

    return this.conversationTurns >= maxTurns || this.vocabCoverage >= targetCoverage;
  }

  // ============================================
  // COMPLETION
  // ============================================

  private async completeUnit(): Promise<void> {
    this.phase = 'complete';

    if (!this.unit) return;

    // Calculate final stats
    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
    const score = Math.round((this.vocabMastered.size / this.unit.vocabulary.length) * 100);

    // Bonus XP for completion
    this.xpEarned += this.unit.xpReward;

    // Save progress
    try {
      await this.learnService.saveConversationProgress(
        this.targetLanguage,
        this.unit.id,
        score,
        true,
        timeSpent,
        this.xpEarned
      );
    } catch (err) {
      console.error('[Lesson] Failed to save progress:', err);
    }
  }

  retryUnit(): void {
    if (!this.unit) return;

    this.currentVocabIndex = 0;
    this.currentPhraseIndex = 0;
    this.vocabMastered.clear();
    this.phrasesCompleted.clear();
    this.conversationHistory = [];
    this.conversationTurns = 0;
    this.xpEarned = 0;
    this.transcript = '';
    this.aiMessage = '';
    this.aiMessageInTargetLang = '';
    this.showCorrection = false;
    this.startTime = Date.now();

    this.startVocabularyPhase();
  }

  exitLesson(): void {
    this.router.navigate(['/learn']);
  }

  async retryPermission(): Promise<void> {
    // Prevent too many retries
    this.permissionRetryCount++;
    if (this.permissionRetryCount > 3) {
      this.needsManualGrant = true;
      this.error = 'Accès au microphone bloqué. Cliquez sur l\'icône du cadenas (🔒) à côté de l\'URL pour autoriser le microphone, puis rechargez la page.';
      return;
    }

    this.error = null;
    this.phase = 'loading';

    const permissionResult = await this.voiceService.ensurePermission();

    if (permissionResult.status === 'granted') {
      // Permission granted, load the unit
      this.needsManualGrant = false;
      const unitId = this.route.snapshot.paramMap.get('id');
      if (unitId) {
        await this.loadUnit(unitId);
      }
    } else {
      this.phase = 'error';
      this.error = permissionResult.message;
      this.needsManualGrant = permissionResult.needsManualGrant || this.permissionRetryCount >= 2;
    }
  }

  // ============================================
  // VOICE & TTS
  // ============================================

  async startListening(): Promise<void> {
    if (!this.voiceService.isSupported()) {
      this.error = 'La reconnaissance vocale n\'est pas supportée';
      return;
    }

    this.isListening = true;
    this.transcript = '';
    this.error = null;
    this.showCorrection = false;

    try {
      // For vocabulary and phrases, listen in target language
      // For roleplay, also target language since user speaks German
      const result = await this.voiceService.listen(this.targetLanguage);
      this.transcript = result;
      this.isListening = false;

      // Process based on current phase
      if (this.phase === 'vocabulary') {
        await this.handleVocabResponse();
      } else if (this.phase === 'phrases') {
        await this.handlePhraseResponse();
      } else if (this.phase === 'roleplay') {
        await this.handleRoleplayResponse();
      }
    } catch (err: any) {
      console.error('[Lesson] Voice error:', err);
      this.isListening = false;

      if (err.message === 'no-speech') {
        this.error = 'Aucune parole détectée. Réessayez.';
      } else {
        this.error = err.message || 'Erreur de reconnaissance vocale';
      }
    }
  }

  stopListening(): void {
    this.voiceService.stopListening();
    this.isListening = false;
  }

  private async playTTS(text: string, language: string): Promise<void> {
    try {
      await this.messagingService.textToSpeech(text, language);
    } catch (err) {
      console.warn('[Lesson] TTS failed:', err);
    }
  }

  async playVocabAudio(): Promise<void> {
    if (this.currentVocab) {
      await this.playTTS(this.currentVocab.word, this.targetLanguage);
    }
  }

  // ============================================
  // AI TUTOR
  // ============================================

  private async getConversationTutorResponse(phase: ConversationPhase): Promise<ConversationTutorResponse> {
    if (!this.unit) {
      throw new Error('No unit loaded');
    }

    return this.messagingService.getConversationTutorResponse({
      phase,
      unit: this.unit,
      userResponse: this.transcript,
      currentVocab: this.currentVocab || undefined,
      currentPhrase: this.currentPhrase || undefined,
      vocabMastered: Array.from(this.vocabMastered),
      conversationHistory: this.conversationHistory,
      targetLanguage: this.targetLanguage,
      nativeLanguage: this.nativeLanguage,
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  getPhaseTitle(): string {
    switch (this.phase) {
      case 'vocabulary': return 'Vocabulaire';
      case 'phrases': return 'Phrases';
      case 'roleplay': return 'Conversation';
      case 'complete': return 'Terminé!';
      default: return '';
    }
  }

  getOverallProgress(): number {
    if (this.phase === 'vocabulary') {
      return Math.round(this.vocabProgress * 0.4);
    } else if (this.phase === 'phrases') {
      return 40 + Math.round(this.phraseProgress * 0.3);
    } else if (this.phase === 'roleplay') {
      return 70 + Math.round(this.vocabCoverage * 0.3);
    } else if (this.phase === 'complete') {
      return 100;
    }
    return 0;
  }
}
