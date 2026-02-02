using System;
using Core.Entities;

namespace Core.Interfaces;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetProductsAsync();
    Task<Product?> GetProductByIdAsync(int id);

    void addProduct(Product product);
    void updateProduct(Product product);
    void deleteProduct(Product product);
    bool ProductExists(int id);
    Task<bool> SaveChangesAsync();

}



