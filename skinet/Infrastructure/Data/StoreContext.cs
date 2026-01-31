using System;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class StoreContext(DbContextOptions options) : DbContext(options)
{
    
    
}
