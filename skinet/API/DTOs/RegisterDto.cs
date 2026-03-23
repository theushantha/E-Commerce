using System;
using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class RegisterDto
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    [RegularExpression("^[A-Za-z][A-Za-z' -]*$", ErrorMessage = "First name can only contain letters, spaces, apostrophes, and hyphens")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    [RegularExpression("^[A-Za-z][A-Za-z' -]*$", ErrorMessage = "Last name can only contain letters, spaces, apostrophes, and hyphens")]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

}
