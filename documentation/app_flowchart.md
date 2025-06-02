flowchart TD
  A[Launch app] --> B{Authenticated?}
  B -->|No| C[Login Signup Screen]
  C --> D[Home Screen]
  B -->|Yes| D
  D --> E[Camera Screen]
  E --> F[Ingredient Review Screen]
  F --> G[Filter Drawer]
  G --> H[Recipe Cards]
  H --> N{Subscribed?}
  N -->|No| O[Subscription Screen]
  O --> I[Cook Mode]
  N -->|Yes| I[Cook Mode]
  I --> J[Share Screen]
  H --> K[Favorites Screen]
  D --> L[Settings]
  L --> M[Profile Screen]