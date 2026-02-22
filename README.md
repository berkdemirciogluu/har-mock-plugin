# har-mock-plugin Monorepo

Yarn Workspaces tabanlı monorepo. Üç paketten oluşur:

| Paket                                         | Açıklama                                              |
| --------------------------------------------- | ----------------------------------------------------- |
| `packages/core` (`@har-mock/core`)            | HAR parser, URL matcher, rule engine — saf TypeScript |
| `packages/extension` (`@har-mock/extension`)  | Chrome Extension (MV3), Angular popup UI              |
| `packages/angular-plugin` (`har-mock-plugin`) | Angular ng-packagr kütüphanesi                        |

## Kurulum

```bash
yarn install
```

## Scriptler

| Script                 | Açıklama                                     |
| ---------------------- | -------------------------------------------- |
| `yarn build:core`      | `@har-mock/core` paketini derle              |
| `yarn build:extension` | Chrome Extension'ı derle                     |
| `yarn build:plugin`    | Angular plugin'i derle                       |
| `yarn test:all`        | Tüm paketlerin testlerini çalıştır           |
| `yarn lint:all`        | Tüm paketleri ESLint ile kontrol et          |
| `yarn format:check`    | Prettier format kurallarına uyumu kontrol et |
| `yarn format:write`    | Tüm dosyaları Prettier ile otomatik formatla |

## Paket Bağımlılık Matrisi

```
packages/core           → Hiçbir workspace bağımlılığı yok
packages/extension      → @har-mock/core (workspace)
packages/angular-plugin → @har-mock/core (workspace)
```

## Önemli Kurallar

- `packages/core`'da Angular ve Chrome API kullanımı **yasaktır**
- `any` tipi kullanımı ESLint kuralı olarak **hata** sayılır
- Bağımlılık yönü: `extension → core`, `angular-plugin → core` (circular import yasak)
- `@har-mock/core`'dan import her zaman barrel (`index.ts`) üzerinden yapılır
