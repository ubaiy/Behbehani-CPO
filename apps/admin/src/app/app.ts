import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// TranslateModule and LanguageService removed — admin app is English-only.
// The old sticky header/main shell has been replaced by AdminShellComponent
// (lazy-loaded via the route guard) so this root component is a bare passthrough.

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<router-outlet />`,
  styleUrl: './app.scss',
})
export class App {}
