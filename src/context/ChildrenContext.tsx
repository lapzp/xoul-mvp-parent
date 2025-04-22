import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChildData } from '../components/ChildCard';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface WhatsappQRResponse {
  qr?: Blob;              // undefined when we join an existing flow
  reused: boolean;        // true ⇒ flow already running
}

interface ChildrenContextType {
  children: ChildData[];
  isLoading: boolean;
  error: string | null;
  addChild: (name: string, age: number, gender: 'male' | 'female' | 'other') => Promise<ChildData>;
  getChild: (id: string) => ChildData | undefined;
  pairWhatsapp: (childId: string) => Promise<WhatsappQRResponse>;
  unpairPhone: (childId: string) => Promise<void>;
  unpairWhatsapp: (childId: string) => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
  setWhatsappConnected: (childId: string, connected: boolean) => void;
  getTraceId: (childId: string) => Promise<string>;
}

const ChildrenContext = createContext<ChildrenContextType | undefined>(undefined);

const API_BASE_URL = "https://xoul-data-backend-267146952341.us-east1.run.app";
const SCRAPER_BASE_URL = "https://xoul-dev.duckdns.org";

const useChildren = () => {
  const context = useContext(ChildrenContext);
  if (!context) {
    throw new Error('useChildren must be used within a ChildrenProvider');
  }
  return context;
};

const ChildrenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, access_token } = useAuth();

  // Load children data from API
  useEffect(() => {
    const loadChildren = async () => {
      if (!user || !access_token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/child_users/list`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch children data');
        }

        const data = await response.json();
        
        // Transform the API data to match our ChildData interface
        const formattedChildren = data.children.map((child: any) => ({
          id: child.id,
          name: child.name,
          age: child.age,
          gender: child.gender,
          adult_id: child.adult_id,
          created_at: child.created_at,
          updated_at: child.updated_at,
          alias: child.alias,
          phoneConnected: false, // We'll need to update this based on actual API response
          whatsappConnected: false // We'll need to update this based on actual API response
        }));

        setChildrenData(formattedChildren);
      } catch (err) {
        setError('Failed to load children data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadChildren();
  }, [user, access_token]);

  const addChild = async (name: string, age: number, gender: 'male' | 'female' | 'other'): Promise<ChildData> => {
    if (!user || !access_token) {
      throw new Error('You must be logged in to add a child');
    }

    setIsLoading(true);
    
    try {
      // Fetch adult_id from /auth/me endpoint if not already available
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'accept': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await userResponse.json();
      const adult_id = userData.adult_id;
      
      // Create the child user
      const response = await fetch(`${API_BASE_URL}/child_users/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          age,
          gender,
          adult_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add child');
      }

      const newChild = await response.json();
      
      // Format the response to match our ChildData interface
      const formattedChild: ChildData = {
        id: newChild.id,
        name: newChild.name,
        age: newChild.age,
        gender: newChild.gender,
        adult_id: newChild.adult_id,
        created_at: newChild.created_at,
        updated_at: newChild.updated_at,
        alias: newChild.alias,
        phoneConnected: false,
        whatsappConnected: false
      };
      
      setChildrenData(prev => [...prev, formattedChild]);
      return formattedChild;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add child';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getChild = (id: string): ChildData | undefined => {
    return childrenData.find(child => child.id.toString() === id);
  };

  const getTraceId = async (childId: string): Promise<string> => {
    const r_trace_id = await fetch(`${SCRAPER_BASE_URL}/scraper/wa/session/get-trace-id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ user_id: childId }),
    });

    if (r_trace_id.ok) {
      const data = await r_trace_id.json();
      const traceId = data.trace_id;
      console.log('traceId', traceId);
      return traceId;
    }

    throw new Error('Failed to get traceId');
  };

  const pairWhatsapp = async (childId: string): Promise<WhatsappQRResponse> => {
    if (!access_token) {
      throw new Error('You must be logged in to pair WhatsApp');
    }

    try {

      const r = await fetch(`${SCRAPER_BASE_URL}/scraper/wa/session/login-qr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: childId }),
      });


      if (r.ok) {
        const qrBlob = await r.blob(); // image/png
        return { qr: qrBlob, reused: false };
      }

      // 400 ⇒ session already running → backend sent JSON with trace_id
      if (r.status === 400) {
        const data = await r.json();
        return { reused: true };
      }

      throw new Error(await r.text());
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Failed to pair WhatsApp';
      toast.error(m);
      throw err;
    }
  };

  const unpairPhone = async (childId: string): Promise<void> => {
    if (!access_token) {
      throw new Error('You must be logged in to unpair a phone');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/child_users/${childId}/unpair-phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unpair phone');
      }
      
      // Update the local state
      setChildrenData(prev => 
        prev.map(child => 
          child.id.toString() === childId 
            ? { ...child, phoneConnected: false } 
            : child
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unpair phone';
      toast.error(errorMessage);
      throw err;
    }
  };

  const unpairWhatsapp = async (childId: string): Promise<void> => {
    if (!access_token) {
      throw new Error('You must be logged in to unpair WhatsApp');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/child_users/${childId}/unpair-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unpair WhatsApp');
      }
      
      // Update the local state
      setChildrenData(prev => 
        prev.map(child => 
          child.id.toString() === childId 
            ? { ...child, whatsappConnected: false } 
            : child
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unpair WhatsApp';
      toast.error(errorMessage);
      throw err;
    }
  };

  const removeChild = async (childId: string): Promise<void> => {
    if (!access_token) {
      throw new Error('You must be logged in to remove a child');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/child_users/${childId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove child');
      }
      
      // Update the local state
      setChildrenData(prev => prev.filter(child => child.id.toString() !== childId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove child';
      toast.error(errorMessage);
      throw err;
    }
  };

  const setWhatsappConnected = (childId: string, connected: boolean) => {
    setChildrenData(prev =>
      prev.map(c =>
        c.id.toString() === childId ? { ...c, whatsappConnected: connected } : c
      ),
    );
  };
  

  return (
    <ChildrenContext.Provider 
      value={{ 
        children: childrenData, 
        isLoading, 
        error, 
        addChild, 
        getChild,
        pairWhatsapp,
        unpairPhone,
        unpairWhatsapp,
        removeChild,
        setWhatsappConnected,
        getTraceId,
      }}
    >
      {children}
    </ChildrenContext.Provider>
  );
};

export { useChildren, ChildrenProvider };
