using System;
using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class CreateProductDto
{
    [Required]
    public  String Name { get; set; } = string.Empty;

    [Required]
    public String Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
    public decimal Price { get; set; }

    [Required]
    public String PictureUrl { get; set; } = string.Empty;

    [Required]
    public  String Type { get; set; } = string.Empty;

    [Required]
    public  String Brand { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Quantity in stock cannot be negative")] 
    public int QuantityInStock { get; set; }


}
