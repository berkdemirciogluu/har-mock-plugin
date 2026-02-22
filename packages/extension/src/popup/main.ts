import 'zone.js';
import './styles.css';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    // services, MessageService, etc. buraya (Story 2.x'te eklenecek)
  ],
}).catch(console.error);
