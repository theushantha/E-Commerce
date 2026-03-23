using System;
using System.Linq;
using System.Security.Claims;
using API.DTOs;
using API.Extensions;
using Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

public class AccountController(SignInManager<AppUser> signInManager) : BaseApiController
{
    [HttpPost("login")]
    public async Task<ActionResult> Login(LoginDto loginDto)
    {
        var user = await signInManager.UserManager.FindByEmailAsync(loginDto.Email);
        
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false);
        
        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        // Return the user info - token will be handled by Identity API endpoints
        return Ok(new
        {
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterDto registerDto)
    {
        var email = registerDto.Email.Trim();

        var existingUser = await signInManager.UserManager.FindByEmailAsync(email);
        if (existingUser != null)
        {
            return BadRequest(new { message = "An account with this email already exists." });
        }

        var user = new AppUser
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = email,
            UserName = email
        };

        var result = await signInManager.UserManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToArray();
            return BadRequest(new
            {
                message = errors.FirstOrDefault() ?? "Registration failed.",
                errors
            });
        }

        // Return the user info
        return Ok(new
        {
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName
        });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("user-info")]
    public async Task<ActionResult> GetUserInfo()
    {
        if (User.Identity?.IsAuthenticated == false) return NoContent();
        
        var user = await signInManager.UserManager.GetUserByEmailWithAddress(User);   
        
        return Ok(new { user.FirstName, user.LastName, user.Email, Address = user.Address?.ToDto() });
    }

    [HttpGet]
    public ActionResult GetAuthState()
    {
        return Ok(new
        {
            IsAuthenticated = User.Identity?.IsAuthenticated ?? false,
        });
    } 

    [Authorize]
    [HttpPost("address")]
    public async Task<ActionResult<Address>> CreateOrUpdateAddress(AddressDto addressDto)
    {
        var user = await signInManager.UserManager.GetUserByEmailWithAddress(User);
        
        if (user.Address == null)
        {
            user.Address = addressDto.toEntity();
        }
        else
        {
            user.Address.UpdateFromDto(addressDto);
        }

        var result = await signInManager.UserManager.UpdateAsync(user);

        if (!result.Succeeded) return BadRequest("Problem updating the user address");

        return Ok(user.Address.ToDto());
    }
   
}

