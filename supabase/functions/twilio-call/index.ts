import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID) {
      console.error('TWILIO_ACCOUNT_SID not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio Account SID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TWILIO_AUTH_TOKEN) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio Auth Token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TWILIO_PHONE_NUMBER) {
      console.error('TWILIO_PHONE_NUMBER not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio Phone Number not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, to, callSid } = await req.json();
    console.log(`Twilio action: ${action}, to: ${to}, callSid: ${callSid}`);

    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    if (action === 'make_call') {
      // Initiate a call
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', TWILIO_PHONE_NUMBER);
      // TwiML to connect the call - simple dial
      formData.append('Twiml', `<Response><Dial>${to}</Dial></Response>`);

      console.log(`Making call to ${to} from ${TWILIO_PHONE_NUMBER}`);

      const response = await fetch(`${twilioApiUrl}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Twilio call response:', JSON.stringify(data));

      if (!response.ok) {
        console.error('Twilio API error:', data);
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to initiate call' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          callSid: data.sid,
          status: data.status 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'end_call') {
      // End an existing call
      if (!callSid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Call SID is required to end call' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Ending call ${callSid}`);

      const formData = new URLSearchParams();
      formData.append('Status', 'completed');

      const response = await fetch(`${twilioApiUrl}/Calls/${callSid}.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Twilio end call response:', JSON.stringify(data));

      if (!response.ok) {
        console.error('Twilio API error:', data);
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to end call' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, status: data.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_status') {
      // Get call status
      if (!callSid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Call SID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${twilioApiUrl}/Calls/${callSid}.json`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to get call status' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: data.status,
          duration: data.duration
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Error in twilio-call function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
