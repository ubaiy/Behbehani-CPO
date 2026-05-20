import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { HeroSliderComponent } from './sections/hero-slider.component';
import { FeaturedCarsComponent } from './sections/featured-cars.component';
import { BrowseByBrandComponent } from './sections/browse-by-brand.component';
import { BrowseByBodyComponent } from './sections/browse-by-body.component';
import { SellCalloutComponent } from './sections/sell-callout.component';
import { LowMileageRailComponent } from './sections/low-mileage-rail.component';
import { PriceBracketsComponent } from './sections/price-brackets.component';
import { HowItWorksComponent } from './sections/how-it-works.component';
import { ServicesPromoComponent } from './sections/services-promo.component';
import { TestimonialsComponent } from './sections/testimonials.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSliderComponent,
    FeaturedCarsComponent,
    BrowseByBrandComponent,
    BrowseByBodyComponent,
    SellCalloutComponent,
    LowMileageRailComponent,
    PriceBracketsComponent,
    HowItWorksComponent,
    ServicesPromoComponent,
    TestimonialsComponent,
  ],
  template: `
    <app-hero-slider />
    <app-featured-cars />
    <app-browse-by-brand />
    <app-browse-by-body />
    <app-sell-callout />
    <app-low-mileage-rail />
    <app-price-brackets />
    <app-how-it-works />
    <app-services-promo />
    <app-testimonials />
  `,
})
export class HomeComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    const setMeta = () => {
      const pageTitle = this.translate.instant('home.title');
      const description = this.translate.instant('home.metaDescription');
      this.title.setTitle(pageTitle);
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:title', content: pageTitle });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
    };
    setMeta();
    this.translate.onLangChange.subscribe(setMeta);
  }
}
