import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Pages where drag & drop should be enabled
const DRAG_DROP_ENABLED_PAGES = [
  '/tickets', // Create new ticket page
  '/tickets/', // Ticket detail pages (starts with /tickets/)
];

export function useRichTextEditorVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOnValidPage, setIsOnValidPage] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pathname = usePathname();

  // Check if current page allows drag & drop
  useEffect(() => {
    const isValid = DRAG_DROP_ENABLED_PAGES.some(page => 
      pathname === page || pathname.startsWith(page)
    );
    setIsOnValidPage(isValid);
  }, [pathname]);

  // Create intersection observer to watch RichTextEditor
  useEffect(() => {
    if (!isOnValidPage) {
      setIsVisible(false);
      return;
    }

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const richTextEntry = entries.find(entry => 
          entry.target.getAttribute('data-rich-text-editor') === 'true'
        );
        
        if (richTextEntry) {
          setIsVisible(richTextEntry.isIntersecting);
        }
      },
      {
        threshold: 0.1, // Trigger when 10% of the editor is visible
        rootMargin: '50px', // Add some margin for better UX
      }
    );

    // Find and observe RichTextEditor elements
    const richTextEditors = document.querySelectorAll('[data-rich-text-editor="true"]');
    richTextEditors.forEach(editor => {
      observerRef.current?.observe(editor);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOnValidPage]);

  // Return whether drag & drop should be enabled
  const shouldEnableDragDrop = isOnValidPage && isVisible;

  return {
    isVisible,
    isOnValidPage,
    shouldEnableDragDrop,
  };
}
