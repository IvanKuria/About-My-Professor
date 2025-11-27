import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfInfoButton from '../../src/react/components/ProfInfoButton.jsx';

// --- MOCKS ---
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://mock-id/${path}`,
  },
};

const mockApiData = {
  cn: ["Professor Test"], 
  mail: ["test@ucsc.edu"],
  telephonenumber: ["555-1234"],
  ucscpersonpubdepartmentnumber: ["Computer Science"],
  ucscpersonpubofficehours: ["Mon 2-4pm"],
  ucscpersonpubresearchinterest: ["Artificial Intelligence"],
  jpegphoto: "https://example.com/photo.jpg?uid=ptest"
};

describe('ProfInfoButton Component', () => {
  
  test('opens the modal when the button is clicked', () => {
    render(<ProfInfoButton apiData={mockApiData} />);
    
    // Click the main button
    const button = screen.getByRole('button', { name: /Professor Info/i });
    fireEvent.click(button);
    
    // Check for the Header
    expect(screen.getByText(/About the Professor/i)).toBeInTheDocument();

    // Check for the Name
    expect(screen.getByText(/Professor Test/i)).toBeInTheDocument();
  });

  test('formats research topic correctly', () => {
     render(<ProfInfoButton apiData={mockApiData} localResearchTopic="Deep Learning" />);
     
     // Open Modal
     fireEvent.click(screen.getByRole('button', { name: /Professor Info/i }));
     
     // Click "More Info" to reveal the research topic
     const moreInfoBtn = screen.getByText(/More Info/i);
     fireEvent.click(moreInfoBtn);

     // Check for the Label using the custom matcher
     expect(screen.getByText((content, element) => {
       return element.tagName.toLowerCase() === 'strong' && content.includes('Research Topic');
     })).toBeInTheDocument();

     // Check for the Value
     expect(screen.getByText(/Deep Learning/i)).toBeInTheDocument();
  });

  test('toggles "More Info" section', () => {
    render(<ProfInfoButton apiData={mockApiData} />);
    fireEvent.click(screen.getByRole('button', { name: /Professor Info/i }));

    const moreBtn = screen.getByText('More Info');
    expect(moreBtn).toBeInTheDocument();

    // Content should NOT be visible yet
    expect(screen.queryByText('Office Hours:')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(moreBtn);
    expect(screen.getByText('Show Less')).toBeInTheDocument();
    expect(screen.getByText('Office Hours:')).toBeInTheDocument();
    
    // Check if Research Interests (which are also inside More Info now) are visible
    expect(screen.getByText(/Artificial Intelligence/i)).toBeInTheDocument();
  });
});