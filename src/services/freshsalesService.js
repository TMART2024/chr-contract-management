const FRESHSALES_DOMAIN = import.meta.env.VITE_FRESHSALES_DOMAIN;
const FRESHSALES_API_KEY = import.meta.env.VITE_FRESHSALES_API_KEY;

/**
 * Sync contract data to FreshSales
 * @param {Object} contract - Contract object to sync
 * @returns {Promise<Object>} Sync result
 */
export async function syncContractToFreshSales(contract) {
  if (contract.type !== 'customer') {
    return {
      success: false,
      error: 'Only customer contracts can be synced to FreshSales'
    };
  }

  try {
    // First, search for existing deal/contact by customer name
    const searchResult = await searchFreshSalesContact(contract.name);
    
    let contactId = searchResult?.id;
    
    if (!contactId) {
      // Create new contact if doesn't exist
      const createResult = await createFreshSalesContact(contract);
      contactId = createResult.id;
    }

    // Update or create deal with contract information
    const dealData = prepareDealData(contract, contactId);
    const dealResult = await upsertFreshSalesDeal(dealData, contract.freshsalesId);

    return {
      success: true,
      freshsalesId: dealResult.id,
      contactId: contactId,
      syncedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('FreshSales sync error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search for a contact in FreshSales by name
 */
async function searchFreshSalesContact(name) {
  try {
    const response = await fetch(
      `https://${FRESHSALES_DOMAIN}/api/contacts/search?q=${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token token=${FRESHSALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`FreshSales search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.contacts?.[0] || null;

  } catch (error) {
    console.error('FreshSales contact search error:', error);
    return null;
  }
}

/**
 * Create a new contact in FreshSales
 */
async function createFreshSalesContact(contract) {
  const contactData = {
    contact: {
      first_name: contract.name.split(' ')[0] || contract.name,
      last_name: contract.name.split(' ').slice(1).join(' ') || 'Account',
      company_name: contract.name,
      custom_field: {
        cf_contract_type: contract.contractType,
        cf_service_types: contract.serviceType?.join(', ') || ''
      }
    }
  };

  const response = await fetch(`https://${FRESHSALES_DOMAIN}/api/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Token token=${FRESHSALES_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create FreshSales contact: ${response.statusText}`);
  }

  const data = await response.json();
  return data.contact;
}

/**
 * Prepare deal data from contract
 */
function prepareDealData(contract, contactId) {
  const endDate = contract.endDate?.toDate?.() || new Date(contract.endDate);
  const renewalDate = contract.renewalDate?.toDate?.() || null;
  
  return {
    deal: {
      name: `${contract.name} - ${contract.contractType.toUpperCase()}`,
      amount: 0, // You might want to add contract value to your schema
      contact_id: contactId,
      expected_close: endDate.toISOString().split('T')[0],
      custom_field: {
        // Custom fields for contract data
        cf_contract_start_date: contract.startDate?.toDate?.()?.toISOString().split('T')[0],
        cf_contract_end_date: endDate.toISOString().split('T')[0],
        cf_renewal_date: renewalDate?.toISOString().split('T')[0] || '',
        cf_auto_renewal: contract.autoRenewal ? 'Yes' : 'No',
        cf_auto_renewal_period: contract.autoRenewalPeriod ? `${contract.autoRenewalPeriod} years` : '',
        cf_cancellation_notice_days: contract.cancellationNoticeDays || 0,
        cf_contract_type: contract.contractType,
        cf_service_types: contract.serviceType?.join(', ') || '',
        cf_contract_status: contract.status,
        cf_risk_level: contract.riskLevel || 'low'
      }
    }
  };
}

/**
 * Create or update a deal in FreshSales
 */
async function upsertFreshSalesDeal(dealData, existingDealId = null) {
  const url = existingDealId 
    ? `https://${FRESHSALES_DOMAIN}/api/deals/${existingDealId}`
    : `https://${FRESHSALES_DOMAIN}/api/deals`;
  
  const method = existingDealId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Token token=${FRESHSALES_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dealData)
  });

  if (!response.ok) {
    throw new Error(`Failed to ${existingDealId ? 'update' : 'create'} FreshSales deal: ${response.statusText}`);
  }

  const data = await response.json();
  return data.deal;
}

/**
 * Get deal details from FreshSales
 */
export async function getFreshSalesDeal(dealId) {
  try {
    const response = await fetch(`https://${FRESHSALES_DOMAIN}/api/deals/${dealId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${FRESHSALES_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FreshSales deal: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      deal: data.deal
    };

  } catch (error) {
    console.error('FreshSales get deal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test FreshSales API connection
 */
export async function testFreshSalesConnection() {
  try {
    const response = await fetch(`https://${FRESHSALES_DOMAIN}/api/contacts?per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${FRESHSALES_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Connected successfully' : 'Connection failed'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
