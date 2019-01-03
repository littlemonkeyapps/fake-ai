import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { Md5 } from 'ts-md5/dist/md5';
import { MediaFile } from './mediafile';
import { Phrase } from './phrase';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  private static TOKEN_URL = 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken';
  private static TTS_URL = 'https://speech.platform.bing.com/synthesize';
  private static REFRESH_TOKEN_DURATION_MINUTES = 9;
  private azureKey: string;
  private azureToken: string;
  private audio: HTMLAudioElement;
  public phrases: Phrase[];
  public static voices = [{ id: 0, lang: 'en-AU', gender: 'Female', name: 'Catherine' },
  { id: 1, lang: 'en-AU', gender: 'Female', name: 'HayleyRUS' },
  { id: 2, lang: 'en-CA', gender: 'Female', name: 'Linda' },
  { id: 3, lang: 'en-CA', gender: 'Female', name: 'HeatherRUS' },
  { id: 4, lang: 'en-GB', gender: 'Female', name: 'Susan, Apollo' },
  { id: 5, lang: 'en-GB', gender: 'Female', name: 'HazelRUS' },
  { id: 6, lang: 'en-GB', gender: 'Male', name: 'George, Apollo' },
  { id: 7, lang: 'en-IE', gender: 'Male', name: 'Sean' },
  { id: 8, lang: 'en-IN', gender: 'Female', name: 'Heera, Apollo' },
  { id: 9, lang: 'en-IN', gender: 'Female', name: 'PriyaRUS' },
  { id: 10, lang: 'en-IN', gender: 'Male', name: 'Ravi, Apollo' },
  { id: 11, lang: 'en-US', gender: 'Female', name: 'ZiraRUS' },
  { id: 12, lang: 'en-US', gender: 'Female', name: 'JessaRUS' },
  { id: 13, lang: 'en-US', gender: 'Male', name: 'BenjaminRUS' }
  ];

  constructor(private http: HttpClient, private cookieService: CookieService) {
    const urlParams = new URLSearchParams(window.location.search);
    this.azureKey = urlParams.get('k');
    
    this.phrases = JSON.parse(localStorage.getItem('phrases')) || [];
  }

  private async getToken() {
    this.azureToken = this.cookieService.get('azuretoken');

    if (this.azureToken) {
      console.log('found token');
      return;
    }

    var options = {
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        'Ocp-Apim-Subscription-Key': this.azureKey
      },
      responseType: 'text' as 'text'
    };

    var token = await this.http.post(TtsService.TOKEN_URL, null, options).toPromise();
    var expires = new Date();
    expires.setTime(expires.getTime() + (60 * 1000 * TtsService.REFRESH_TOKEN_DURATION_MINUTES));

    this.azureToken = token;
    this.cookieService.set('azuretoken', token, expires);

    return token;
  }

  private getLocalPhrase(text: string): MediaFile {
    var hashedPhrase = <string>Md5.hashStr(text);
    var stringStorageValue = <string>localStorage.getItem('phrase_' + hashedPhrase);

    if (stringStorageValue) {
      console.log(text + ' exists');
      return <MediaFile>JSON.parse(stringStorageValue);
    }

    return null;
  }

  clear(){
    localStorage.clear();
    this.phrases=[];
  }

  private buildVoiceString(voiceId: number) {
    var selectedVoice = TtsService.voices[voiceId];

    return `Microsoft Server Speech Text to Speech Voice (${selectedVoice.lang}, ${selectedVoice.name})`;
  }

  private async getInternetPhrase(text: string, voiceId: number) {
    var gender = TtsService.voices[voiceId].gender;
    var voiceString = this.buildVoiceString(voiceId);
    await this.getToken();

    console.log('talking to network')
    var hashedPhrase = <string>Md5.hashStr(text);

    var options = {
      headers: {
        'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
        'Content-Type': 'application/ssml+xml',
        'Authorization': 'Bearer ' + this.azureToken,
        'X-Search-AppId': '148e2d8682aa45809d436b8e690e362f',
        'X-Search-ClientID': '78a98df24a7c4f2585a8fddc1d7ff652'
      },
      responseType: 'blob' as 'text',
    };
    var body = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-AU' xml:gender='${gender}' name='${voiceString}'><prosody rate="+00.00%">${text}</prosody></voice></speak>`;

    var response = await this.http.post(TtsService.TTS_URL, body, options).toPromise();
    var blob = new Blob([response], { type: 'audio/mp3' });


    var reader = new FileReader();
    reader.addEventListener('loadend', function () {
      var base64FileData = reader.result.toString();

      var mediaFile = new MediaFile(text, blob.size, blob.type, base64FileData);

      localStorage.setItem('phrase_' + hashedPhrase, JSON.stringify(mediaFile));

    });
    this.phrases.push(new Phrase(text, hashedPhrase));
    localStorage.setItem('phrases', JSON.stringify(this.phrases));
    reader.readAsDataURL(blob);

    return blob;
  }

  async convertTTS(text: string, voiceId: number) {
    this.audio = this.audio || <HTMLAudioElement>document.getElementById('audio');
    var localMediaFile = this.getLocalPhrase(text);

    if (localMediaFile) {
      this.audio.src = localMediaFile.src;
    }
    else {
      var blob = await this.getInternetPhrase(text, voiceId);
      this.audio.src = window.URL.createObjectURL(blob);
    }

    this.audio.load;
    var playPromise = this.audio.play();

    if (playPromise !== undefined) {
      playPromise.then(function () {
        // Automatic playback started!
      }).catch(function (error) {
        // Automatic playback failed.
        // Show a UI element to let the user manually start playback.
        console.log(error)
      });
    }
  }
}
