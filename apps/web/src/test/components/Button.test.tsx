/**
 * Button Component Tests
 * 
 * Example of component testing without database interaction.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("renders with default variant", () => {
    const { getByRole } = render(<Button>Click me</Button>);
    
    const button = getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("renders with different variants", () => {
    const { rerender, getByRole } = render(
      <Button variant="destructive">Delete</Button>
    );
    
    expect(getByRole("button")).toHaveClass("bg-destructive");

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByRole("button")).toHaveClass("border");
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(getByRole("button"));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    const { getByRole } = render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    
    const button = getByRole("button");
    expect(button).toBeDisabled();
    
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with loading state", () => {
    const { getByRole, getByText } = render(
      <Button disabled>
        <span className="animate-spin">⏳</span>
        Loading...
      </Button>
    );
    
    expect(getByRole("button")).toBeDisabled();
    expect(getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders as a link when asChild is used", () => {
    const { getByRole } = render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = getByRole("link", { name: /link button/i });
    expect(link).toHaveAttribute("href", "/test");
  });
});
