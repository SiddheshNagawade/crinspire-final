// Admin authentication utilities
import { supabase } from '../supabaseClient';

/**
 * Check if an email is in the admin whitelist
 */
export const isEmailAdminWhitelisted = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('email')
      .eq('email', email)
      .limit(1)
      .single();

    return !!data && !error;
  } catch (error) {
    console.error('Error checking admin whitelist by email:', error);
    return false;
  }
};

/**
 * Check admin by Supabase auth `user_id` (preferred)
 */
export const isUserIdAdminWhitelisted = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    return !!data && !error;
  } catch (error) {
    console.error('Error checking admin whitelist by user_id:', error);
    return false;
  }
};

/**
 * Authenticate instructor with email/password and verify against whitelist
 */
export const authenticateInstructor = async (
  email: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  isAdmin?: boolean;
}> => {
  try {
    // Step 1: Sign in with Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const user = data.user;

    if (!user) {
      return {
        success: false,
        error: 'Authentication failed. Please try again.',
      };
    }

    // Step 2: Check admin whitelist by user_id (preferred), fallback to email
    const userId = user.id;
    let isAdmin = false;

    if (userId) {
      isAdmin = await isUserIdAdminWhitelisted(userId);
    }

    if (!isAdmin) {
      // fallback to email-based check for older entries
      isAdmin = await isEmailAdminWhitelisted(user.email || '');
    }

    if (!isAdmin) {
      return {
        success: false,
        error: 'Access denied. Your account is not authorized as an instructor.',
      };
    }

    return {
      success: true,
      isAdmin: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
};

/**
 * Check current user's admin status
 */
export const checkCurrentUserAdminStatus = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const user = session?.user;
    if (!user) return false;

    // prefer checking by user id
    if (user.id) {
      const byId = await isUserIdAdminWhitelisted(user.id);
      if (byId) return true;
    }

    // fallback to email-based check
    if (user.email) {
      return await isEmailAdminWhitelisted(user.email);
    }

    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get admin whitelist (for super admins managing other admins)
 * Note: Use with caution, implement proper RLS in Supabase
 */
export const getAdminWhitelist = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('email');

    if (error) throw error;
    
    return data?.map((row: any) => row.email) || [];
  } catch (error) {
    console.error('Error fetching admin whitelist:', error);
    return [];
  }
};

/**
 * Add email to admin whitelist (admin only)
 */
export const addAdminEmail = async (email: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Verify current user is admin
    const isAdmin = await checkCurrentUserAdminStatus();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can add other admins',
      };
    }

    const { error } = await supabase
      .from('admin_whitelist')
      .insert([{ email }]);

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Email already in whitelist' };
      }
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to add admin',
    };
  }
};

/**
 * Remove email from admin whitelist (admin only)
 */
export const removeAdminEmail = async (email: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Verify current user is admin
    const isAdmin = await checkCurrentUserAdminStatus();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only admins can remove admins',
      };
    }

    const { error } = await supabase
      .from('admin_whitelist')
      .delete()
      .eq('email', email);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to remove admin',
    };
  }
};
