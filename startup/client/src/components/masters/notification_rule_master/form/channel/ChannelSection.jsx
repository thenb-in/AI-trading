import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { RULE_CHANNEL, CHANNEL_LOOK } from '../../constants';
import { RuleSection } from '../RuleSection';
import { ChannelTile } from './ChannelTile';
import { ChannelFields } from './ChannelFields';


const ChannelSection = ({ rule, onChange }) => {
  const channels = rule.channels || {};
  const isOn = (channel) => Boolean(channels[channel]?.enabled);
  const valueOf = (channel, field) => channels[channel]?.[field] || '';
  const enabledCount = Object.values(RULE_CHANNEL).filter(isOn).length;

  return (
    <RuleSection
      step={3}
      title="How it goes out"
      hint="Turn on the channels this rule should use."
      count={enabledCount}
    >
      <div className="flex gap-3 px-4 py-3">
        {Object.values(RULE_CHANNEL).map((channel) => (
          <ChannelTile
            key={channel}
            {...CHANNEL_LOOK[channel]}
            enabled={isOn(channel)}
            onToggle={() => onChange(channel, { enabled: !isOn(channel) })}
          />
        ))}
      </div>

      {isOn(RULE_CHANNEL.IN_APP) && (
        <ChannelFields {...CHANNEL_LOOK[RULE_CHANNEL.IN_APP]}>
          <TextTypeField
            name="in_app_title"
            label="Title"
            value={valueOf(RULE_CHANNEL.IN_APP, 'title')}
            placeholder="Shown in bold on the bell"
            onChange={(e) => onChange(RULE_CHANNEL.IN_APP, { title: e.target.value })}
          />
          <TextareaTypeField
            name="in_app_body"
            label="Message"
            rows={2}
            value={valueOf(RULE_CHANNEL.IN_APP, 'body')}
            placeholder="What the notification says"
            onChange={(e) => onChange(RULE_CHANNEL.IN_APP, { body: e.target.value })}
          />
        </ChannelFields>
      )}

      {isOn(RULE_CHANNEL.EMAIL) && (
        <ChannelFields {...CHANNEL_LOOK[RULE_CHANNEL.EMAIL]}>
          <TextTypeField
            name="email_subject"
            label="Subject"
            value={valueOf(RULE_CHANNEL.EMAIL, 'subject')}
            placeholder="The subject line"
            onChange={(e) => onChange(RULE_CHANNEL.EMAIL, { subject: e.target.value })}
          />
          <TextareaTypeField
            name="email_body"
            label="Body"
            rows={5}
            value={valueOf(RULE_CHANNEL.EMAIL, 'body')}
            placeholder="What the mail says"
            onChange={(e) => onChange(RULE_CHANNEL.EMAIL, { body: e.target.value })}
          />
        </ChannelFields>
      )}

      {isOn(RULE_CHANNEL.WHATSAPP) && (
        <ChannelFields {...CHANNEL_LOOK[RULE_CHANNEL.WHATSAPP]}>
          <TextTypeField
            name="whatsapp_template_name"
            label="Template name"
            value={valueOf(RULE_CHANNEL.WHATSAPP, 'template_name')}
            placeholder="As registered with the provider"
            onChange={(e) => onChange(RULE_CHANNEL.WHATSAPP, { template_name: e.target.value })}
          />
          <TextTypeField
            name="whatsapp_header"
            label="Header value"
            value={valueOf(RULE_CHANNEL.WHATSAPP, 'header')}
            placeholder="Only if the template's header has a variable"
            onChange={(e) => onChange(RULE_CHANNEL.WHATSAPP, { header: e.target.value })}
          />
          {/* The message is kept too, or the rule cannot say what it sends. */}
          <TextareaTypeField
            name="whatsapp_body"
            label="Template message"
            rows={3}
            value={valueOf(RULE_CHANNEL.WHATSAPP, 'body')}
            placeholder="One line per variable the template expects"
            onChange={(e) => onChange(RULE_CHANNEL.WHATSAPP, { body: e.target.value })}
          />
          <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              WhatsApp sends the provider&apos;s approved template, and fills its variables
              from this message — <strong>one line per variable</strong>, in the order the
              template declares them. The name must match it exactly.
            </span>
          </p>
        </ChannelFields>
      )}
    </RuleSection>
  );
};

ChannelSection.propTypes = {
  rule: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

export { ChannelSection };
