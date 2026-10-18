declare module 'node-nlp' {
  export class NlpManager {
    constructor(options?: { languages?: string[], forceNER?: boolean });
    
    addDocument(language: string, text: string, intent: string): void;
    addNamedEntityText(entityName: string, entityValue: string, languages: string[], texts: string[]): void;
    train(): Promise<void>;
    process(language: string, text: string): Promise<{
      intent: string;
      score: number;
      entities?: any[];
      classifications?: any[];
    }>;
    save(filename: string): Promise<void>;
    load(filename: string): Promise<void>;
  }
}