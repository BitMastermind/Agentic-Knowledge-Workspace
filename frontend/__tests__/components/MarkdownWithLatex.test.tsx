/**
 * Tests for MarkdownWithLatex component
 * 
 * Note: These tests verify basic rendering since react-markdown is mocked.
 * For full markdown rendering tests, consider E2E tests.
 */

import { render, screen } from '@testing-library/react'
import { MarkdownWithLatex } from '@/components/MarkdownWithLatex'

describe('MarkdownWithLatex', () => {
  it('renders component with content', () => {
    const { container } = render(<MarkdownWithLatex content="Hello World" />)
    expect(container).toBeInTheDocument()
    // Since react-markdown is mocked, we just verify the component renders
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<MarkdownWithLatex content="Test" className="custom-class" />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('custom-class')
  })

  it('handles empty content', () => {
    const { container } = render(<MarkdownWithLatex content="" />)
    expect(container).toBeInTheDocument()
  })

  it('handles empty content', () => {
    const { container } = render(<MarkdownWithLatex content="" />)
    expect(container).toBeInTheDocument()
  })

  it('handles null content gracefully', () => {
    const { container } = render(<MarkdownWithLatex content={null as any} />)
    expect(container).toBeInTheDocument()
  })
})

