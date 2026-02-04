import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<App />);
    expect(screen.getByText('subtitle')).toBeInTheDocument();
  });

  it('renders textarea with placeholder', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('reviewPlaceholder')).toBeInTheDocument();
  });

  it('renders all source buttons', () => {
    render(<App />);
    const sources = ['sources.appstore', 'sources.restaurant', 'sources.ecommerce', 'sources.hotel', 'sources.other'];
    sources.forEach(s => {
      expect(screen.getByText(s)).toBeInTheDocument();
    });
  });

  it('renders translate button disabled when empty', () => {
    render(<App />);
    const btn = screen.getByText('translateBtn');
    expect(btn).toBeDisabled();
  });

  it('enables translate button with text input', () => {
    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad app' } });
    const btn = screen.getByText('translateBtn');
    expect(btn).not.toBeDisabled();
  });

  it('highlights active source', () => {
    render(<App />);
    const restaurantBtn = screen.getByText('sources.restaurant');
    fireEvent.click(restaurantBtn);
    expect(restaurantBtn.className).toContain('active');
  });

  it('renders language switcher buttons', () => {
    render(<App />);
    const langBtns = screen.getAllByTitle(/.+/);
    expect(langBtns.length).toBe(7);
  });

  it('shows results after successful translation', async () => {
    const mockResult = {
      original: 'Bad review',
      user_really_means: 'User means this',
      boss_hears: 'Boss hears this',
      source: 'appstore',
      language: 'en',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad review' } });

    const btn = screen.getByText('translateBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('User means this')).toBeInTheDocument();
      expect(screen.getByText('Boss hears this')).toBeInTheDocument();
    });
  });

  it('shows error on failed translation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad' } });

    const btn = screen.getByText('translateBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });

  it('shows loading state while translating', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad' } });

    const btn = screen.getByText('translateBtn');
    fireEvent.click(btn);

    expect(screen.getByText('translating')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(<App />);
    expect(screen.getByText('footer')).toBeInTheDocument();
  });

  it('copy button works', async () => {
    const mockResult = {
      original: 'Bad review',
      user_really_means: 'User text',
      boss_hears: 'Boss text',
      source: 'appstore',
      language: 'en',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad review' } });

    const btn = screen.getByText('translateBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      const copyBtns = screen.getAllByText('copy');
      expect(copyBtns.length).toBe(2);
      fireEvent.click(copyBtns[0]);
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('User text');
    });
  });

  it('handles fetch exception', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<App />);
    const textarea = screen.getByPlaceholderText('reviewPlaceholder');
    fireEvent.change(textarea, { target: { value: 'Bad' } });
    fireEvent.click(screen.getByText('translateBtn'));

    await waitFor(() => {
      expect(screen.getByText('error')).toBeInTheDocument();
    });
  });
});
