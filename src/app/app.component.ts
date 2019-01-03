import { Component } from '@angular/core';
import { TtsService } from '../app/tts.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'camp-ai';
  voices = TtsService.voices;
  //phrases = TtsService.phrases;

  clearPhrases(){
    this.ttsService.clear();;
  }

  addPhrase(newPhrase:string, voiceId:number){
    this.ttsService.convertTTS(newPhrase, voiceId);
  }
 
  constructor(private ttsService: TtsService) {
  } 
}
