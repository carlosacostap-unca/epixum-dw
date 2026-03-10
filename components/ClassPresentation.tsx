'use client';

import { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';

interface ClassPresentationProps {
  title: string;
  description: string;
  slidesUrl?: string;
}

export default function ClassPresentation({ title, description, slidesUrl }: ClassPresentationProps) {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<Reveal.Api | null>(null);

  // Si tenemos una URL de slides, mostramos un iframe con la presentación
  if (slidesUrl) {
    return (
        <iframe 
            src={slidesUrl} 
            className="w-screen h-screen border-0 absolute top-0 left-0 z-50 bg-white"
            allowFullScreen
        />
    );
  }

  // Si no hay slidesUrl, generamos la presentación por defecto usando Reveal.js localmente
  useEffect(() => {
    // Solo inicializar si estamos en el cliente y tenemos la referencia
    if (deckDivRef.current && !revealRef.current) {
      
      const deck = new Reveal(deckDivRef.current, {
        hash: true,
        embedded: false, // Queremos pantalla completa
        controls: true,
        progress: true,
        center: true,
        transition: 'slide', // none/fade/slide/convex/concave/zoom
      });

      deck.initialize().then(() => {
        revealRef.current = deck;
      });
    }

    return () => {
      try {
        if (revealRef.current) {
          revealRef.current.destroy();
          revealRef.current = null;
        }
      } catch (e) {
        console.warn("Reveal destroy error", e);
      }
    };
  }, []);

  // Generamos contenido por defecto basado en la descripción
  // Dividimos la descripción por '---' para crear slides simples
  const finalContent = `
    <section>
      <h1>${title}</h1>
      <p>Presentación de la clase</p>
    </section>
    ${description.split('---').map(part => `
      <section>
        <p>${part.trim()}</p>
      </section>
    `).join('')}
    <section>
      <h2>Gracias</h2>
    </section>
  `;

  return (
    <div className="reveal" ref={deckDivRef} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, height: '100vh', width: '100vw', zIndex: 50 }}>
      <div 
        className="slides" 
        dangerouslySetInnerHTML={{ __html: finalContent }} 
      />
    </div>
  );
}
