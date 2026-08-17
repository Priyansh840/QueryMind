/**
 * MYND — Terminal Quick Capture Controller
 * Architecture: Apple + Linear + Arc Browser Paradigm
 * Quiet background ingestion with zero intrusive popups
 */

class CaptureController {
  constructor() {
    this.input = document.getElementById('captureInput');
    this.submitBtn = document.getElementById('captureSubmit');
    this.selectedType = 'Text';

    this.initEvents();
  }

  initEvents() {
    if (this.submitBtn) {
      this.submitBtn.addEventListener('click', () => this.handleCapture());
    }

    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleCapture();
        }
      });
    }
  }

  handleCapture() {
    if (!this.input) return;
    const val = this.input.value.trim();
    if (!val) return;

    this.input.value = '';
    this.input.blur();
    
    if (window.store) {
      window.store.addCapturedItem(val, this.selectedType);
    }
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.captureController = new CaptureController();
});
