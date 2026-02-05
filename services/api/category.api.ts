import { fetchWithAuth } from "@/lib/api-client/auth-client";
import { API_BASE_URL } from "@/lib/constants";
import { CategoryWithSubcategories, MenuItemDetails } from "@/types/catering.types";

class CategoryService {
  async getCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/categories/with-subcategories`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch categories with subcategories");
    }

    return response.json();
  }

  async getMenuItemsByCategory(categoryId: string): Promise<MenuItemDetails[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/menu-item/category/${categoryId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch menu items by category");
    }

    return response.json();
  }

  async getMenuItemsBySubcategory(subcategoryId: string): Promise<MenuItemDetails[]> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/menu-item/subcategory/${subcategoryId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch menu items by subcategory");
    }

    return response.json();
  }
}

export const categoryService = new CategoryService();
