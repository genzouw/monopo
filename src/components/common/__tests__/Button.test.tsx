import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import Button from '../Button';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('通常状態では onClick が呼ばれる', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>OK</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('aria-disabled="true" のときはネイティブ disabled が付与されない（フォーカス可能）', () => {
    render(
      <Button aria-disabled="true" onClick={() => {}}>
        NG
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'NG' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('aria-disabled="true" のとき onClick は呼ばれない', () => {
    const handleClick = vi.fn();
    render(
      <Button aria-disabled="true" onClick={handleClick}>
        NG
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'NG' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('aria-disabled={true}（真偽値）も "true" と同様に扱われる', () => {
    const handleClick = vi.fn();
    render(
      <Button aria-disabled={true} onClick={handleClick}>
        NG
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'NG' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('aria-disabled が無効のときクリックは親要素にバブリングしない', () => {
    const parentClick = vi.fn();
    const handleClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <Button aria-disabled="true" onClick={handleClick}>
          NG
        </Button>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'NG' }));
    expect(handleClick).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('aria-describedby はそのまま付与される', () => {
    render(
      <>
        <Button aria-disabled="true" aria-describedby="hint">
          NG
        </Button>
        <div id="hint">理由</div>
      </>,
    );
    expect(screen.getByRole('button', { name: 'NG' })).toHaveAttribute(
      'aria-describedby',
      'hint',
    );
  });
});
