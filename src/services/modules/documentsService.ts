/**
 * Documents Service - خدمة المستندات
 * إدارة المستندات والملفات المرفقة
 */

import { supabase, generateUniqueId, generateUUID } from '../core/supabaseClient';
import { Document, DocumentFolder, DocumentCategory, FileMetadata } from '../../../types';

// ==================== Document Folders Service ====================
export const documentFoldersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      projectId: f.project_id,
      description: f.description,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      createdBy: f.created_by,
    }));
  },

  async getByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      projectId: f.project_id,
      description: f.description,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      createdBy: f.created_by,
    }));
  },

  async create(folder: Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateUUID();
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('document_folders')
      .insert([{
        id,
        name: folder.name,
        parent_id: folder.parentId || null,
        project_id: folder.projectId || null,
        description: folder.description || null,
        created_at: now,
        updated_at: now,
        created_by: folder.createdBy || null,
      }]);
    if (error) throw error;
    return id;
  },

  async update(id: string, folder: Partial<Omit<DocumentFolder, 'id' | 'createdAt'>>) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (folder.name !== undefined) updateData.name = folder.name;
    if (folder.parentId !== undefined) updateData.parent_id = folder.parentId;
    if (folder.description !== undefined) updateData.description = folder.description;
    
    const { error } = await supabase
      .from('document_folders')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ==================== Document Categories Service ====================
export const documentCategoriesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      createdAt: c.created_at,
    }));
  },

  async create(category: Omit<DocumentCategory, 'id' | 'createdAt'>) {
    const id = generateUUID();
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('document_categories')
      .insert([{
        id,
        name: category.name,
        description: category.description || null,
        color: category.color || null,
        icon: category.icon || null,
        created_at: now,
      }]);
    if (error) throw error;
    return id;
  },

  async update(id: string, category: Partial<Omit<DocumentCategory, 'id' | 'createdAt'>>) {
    const updateData: any = {};
    
    if (category.name !== undefined) updateData.name = category.name;
    if (category.description !== undefined) updateData.description = category.description;
    if (category.color !== undefined) updateData.color = category.color;
    if (category.icon !== undefined) updateData.icon = category.icon;
    
    const { error } = await supabase
      .from('document_categories')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('document_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ==================== Documents Service ====================
export const documentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_folders (name),
        document_categories (name, color),
        projects (name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      fileName: d.file_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      fileType: d.file_type,
      mimeType: d.mime_type,
      folderId: d.folder_id,
      folderName: d.document_folders?.name || '',
      categoryId: d.category_id,
      categoryName: d.document_categories?.name || '',
      categoryColor: d.document_categories?.color || '',
      projectId: d.project_id,
      projectName: d.projects?.name || '',
      description: d.description,
      tags: d.tags || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      createdBy: d.created_by,
      storagePath: d.storage_path,
    }));
  },

  async getByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_folders (name),
        document_categories (name, color)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      fileName: d.file_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      fileType: d.file_type,
      mimeType: d.mime_type,
      folderId: d.folder_id,
      folderName: d.document_folders?.name || '',
      categoryId: d.category_id,
      categoryName: d.document_categories?.name || '',
      categoryColor: d.document_categories?.color || '',
      projectId: d.project_id,
      description: d.description,
      tags: d.tags || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      createdBy: d.created_by,
      storagePath: d.storage_path,
    }));
  },

  async getByFolderId(folderId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_categories (name, color)
      `)
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      fileName: d.file_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      fileType: d.file_type,
      mimeType: d.mime_type,
      folderId: d.folder_id,
      categoryId: d.category_id,
      categoryName: d.document_categories?.name || '',
      categoryColor: d.document_categories?.color || '',
      projectId: d.project_id,
      description: d.description,
      tags: d.tags || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      createdBy: d.created_by,
      storagePath: d.storage_path,
    }));
  },

  async create(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateUUID();
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('documents')
      .insert([{
        id,
        name: document.name,
        file_name: document.fileName,
        file_url: document.fileUrl,
        file_size: document.fileSize || null,
        file_type: document.fileType || null,
        mime_type: document.mimeType || null,
        folder_id: document.folderId || null,
        category_id: document.categoryId || null,
        project_id: document.projectId || null,
        description: document.description || null,
        tags: document.tags || [],
        created_at: now,
        updated_at: now,
        created_by: document.createdBy || null,
        storage_path: document.storagePath || null,
      }]);
    if (error) throw error;
    return id;
  },

  async update(id: string, document: Partial<Omit<Document, 'id' | 'createdAt'>>) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (document.name !== undefined) updateData.name = document.name;
    if (document.fileName !== undefined) updateData.file_name = document.fileName;
    if (document.fileUrl !== undefined) updateData.file_url = document.fileUrl;
    if (document.folderId !== undefined) updateData.folder_id = document.folderId;
    if (document.categoryId !== undefined) updateData.category_id = document.categoryId;
    if (document.description !== undefined) updateData.description = document.description;
    if (document.tags !== undefined) updateData.tags = document.tags;
    
    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(query: string, projectId?: string) {
    let queryBuilder = supabase
      .from('documents')
      .select(`
        *,
        document_folders (name),
        document_categories (name, color),
        projects (name)
      `)
      .or(`name.ilike.%${query}%,file_name.ilike.%${query}%,description.ilike.%${query}%`);
    
    if (projectId) {
      queryBuilder = queryBuilder.eq('project_id', projectId);
    }
    
    const { data, error } = await queryBuilder.order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      fileName: d.file_name,
      fileUrl: d.file_url,
      fileSize: d.file_size,
      fileType: d.file_type,
      mimeType: d.mime_type,
      folderId: d.folder_id,
      folderName: d.document_folders?.name || '',
      categoryId: d.category_id,
      categoryName: d.document_categories?.name || '',
      categoryColor: d.document_categories?.color || '',
      projectId: d.project_id,
      projectName: d.projects?.name || '',
      description: d.description,
      tags: d.tags || [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      createdBy: d.created_by,
      storagePath: d.storage_path,
    }));
  },
};

// ==================== Storage Service ====================
export const storageService = {
  async uploadFile(bucket: string, path: string, file: File, options?: { upsert?: boolean }) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: options?.upsert || false,
      });
    if (error) throw error;
    return data;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    if (error) throw error;
  },

  async deleteFiles(bucket: string, paths: string[]) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);
    if (error) throw error;
  },

  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async listFiles(bucket: string, path?: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);
    if (error) throw error;
    return data;
  },

  async moveFile(bucket: string, fromPath: string, toPath: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);
    if (error) throw error;
  },

  async copyFile(bucket: string, fromPath: string, toPath: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);
    if (error) throw error;
  },
};
