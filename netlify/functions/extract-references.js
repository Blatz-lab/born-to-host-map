const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Autoriser CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Gérer preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Récupérer le fichier uploadé
    const body = JSON.parse(event.body);
    const fileContent = body.fileContent; // Base64
    const fileType = body.fileType; // ex: "application/pdf"

    // Ta clé API Claude (à configurer dans Netlify)
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured');
    }

    // Préparer la requête pour Claude
    let content;
    
    if (fileType.includes('pdf')) {
      // Pour PDF, Claude peut le lire directement
      content = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fileContent
          }
        },
        {
          type: "text",
          text: `Analyse ce document de devis et extrais UNIQUEMENT les références d'appartements. 
          
Les références sont au format : lettre + chiffre + lettre + chiffre(s)
Exemples : A2B22, A1B15, A3B08, B4C102

Réponds UNIQUEMENT avec les références séparées par des virgules, sans aucun autre texte.
Si tu ne trouves aucune référence, réponds "AUCUNE".`
        }
      ];
    } else {
      // Pour images
      const imageType = fileType.includes('png') ? 'image/png' : 'image/jpeg';
      content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imageType,
            data: fileContent
          }
        },
        {
          type: "text",
          text: `Analyse cette image de devis et extrais UNIQUEMENT les références d'appartements. 
          
Les références sont au format : lettre + chiffre + lettre + chiffre(s)
Exemples : A2B22, A1B15, A3B08, B4C102

Réponds UNIQUEMENT avec les références séparées par des virgules, sans aucun autre texte.
Si tu ne trouves aucune référence, réponds "AUCUNE".`
        }
      ];
    }

    // Appeler l'API Claude avec le nouveau modèle
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: content
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${JSON.stringify(data)}`);
    }

    // Extraire le texte de la réponse
    const text = data.content[0].text.trim();
    
    // Parser les références
    let references = [];
    if (text !== 'AUCUNE') {
      references = text
        .split(',')
        .map(ref => ref.trim().toUpperCase())
        .filter(ref => ref.length > 0);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        references: references,
        rawResponse: text
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
